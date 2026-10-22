package main

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestLoopbackListenerStartsAndShutsDown(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	ctx, cancel := context.WithCancel(context.Background())
	finished := make(chan error, 1)
	go func() { finished <- serveListener(ctx, listener) }()
	client := &http.Client{Timeout: 500 * time.Millisecond}
	var available bool
	for attempt := 0; attempt < 40; attempt++ {
		resp, err := client.Get("http://" + address + "/healthz")
		if err == nil {
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("liveness unexpected status %d", resp.StatusCode)
			}
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			available = true
			break
		}
		time.Sleep(25 * time.Millisecond)
	}
	if !available {
		t.Fatal("native development liveness never became available")
	}
	resp, err := client.Get("http://" + address + "/readyz")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("unready service claimed HTTP %d", resp.StatusCode)
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	cancel()
	select {
	case err := <-finished:
		if err != nil {
			t.Fatalf("shutdown failed: %v", err)
		}
	case <-time.After(4 * time.Second):
		t.Fatal("shutdown did not complete")
	}
	conn, err := net.DialTimeout("tcp", address, 100*time.Millisecond)
	if err == nil {
		conn.Close()
		t.Fatal("development listener remained available after shutdown")
	}
}

func TestDevelopmentListenerAlreadyInUseFails(t *testing.T) {
	reserved, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer reserved.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := serve(ctx, reserved.Addr().String()); err == nil {
		t.Fatal("duplicate server unexpectedly bound to an occupied port")
	}
}

func TestCanceledServeListenerRejectsFollowupRequests(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := serveListener(ctx, listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		t.Fatal(err)
	}
	_, err = net.DialTimeout("tcp", listener.Addr().String(), 100*time.Millisecond)
	if err == nil || !strings.Contains(err.Error(), "refused") {
		t.Fatalf("canceled listener could still accept connections: %v", err)
	}
}
