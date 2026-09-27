package config

import (
	"errors"
	"testing"
)

func TestLoadFromDefaultsToLoopback(t *testing.T) {
	cfg, err := LoadFrom(func(string) string { return "" })
	if err != nil {
		t.Fatalf("LoadFrom() error = %v", err)
	}
	if cfg.ListenAddress != DefaultListenAddress {
		t.Fatalf("ListenAddress = %q, want %q", cfg.ListenAddress, DefaultListenAddress)
	}
}

func TestLoadFromAcceptsExplicitLoopback(t *testing.T) {
	cases := []string{"127.0.0.1:9000", "localhost:9000", "[::1]:9000"}
	for _, value := range cases {
		t.Run(value, func(t *testing.T) {
			cfg, err := LoadFrom(func(key string) string {
				if key == "GOREECLOUD_VAULT_LISTEN" {
					return value
				}
				return ""
			})
			if err != nil {
				t.Fatalf("LoadFrom() error = %v", err)
			}
			if cfg.ListenAddress != value {
				t.Fatalf("ListenAddress = %q, want %q", cfg.ListenAddress, value)
			}
		})
	}
}

func TestLoadFromRejectsNonLoopback(t *testing.T) {
	cases := []string{"0.0.0.0:8787", "192.168.1.20:8787", ":8787", "example.com:8787"}
	for _, value := range cases {
		t.Run(value, func(t *testing.T) {
			_, err := LoadFrom(func(key string) string {
				if key == "GOREECLOUD_VAULT_LISTEN" {
					return value
				}
				return ""
			})
			if !errors.Is(err, ErrNonLoopbackListen) {
				t.Fatalf("LoadFrom() error = %v, want ErrNonLoopbackListen", err)
			}
		})
	}
}

func TestLoadFromRejectsInvalidPort(t *testing.T) {
	_, err := LoadFrom(func(key string) string {
		if key == "GOREECLOUD_VAULT_LISTEN" {
			return "127.0.0.1:70000"
		}
		return ""
	})
	if err == nil {
		t.Fatal("LoadFrom() error = nil, want invalid port error")
	}
}
