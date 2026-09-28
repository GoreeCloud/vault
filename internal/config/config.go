package config

import (
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

const DefaultListenAddress = "127.0.0.1:8787"

var ErrNonLoopbackListen = errors.New("vault development server must listen on loopback only")

type Config struct {
	ListenAddress string
}

func Load() (Config, error) {
	return LoadFrom(os.Getenv)
}

func LoadFrom(getenv func(string) string) (Config, error) {
	addr := strings.TrimSpace(getenv("GOREECLOUD_VAULT_LISTEN"))
	if addr == "" {
		addr = DefaultListenAddress
	}

	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return Config{}, fmt.Errorf("parse GOREECLOUD_VAULT_LISTEN: %w", err)
	}
	if host == "" || !isExplicitLoopback(host) {
		return Config{}, fmt.Errorf("%w: %q", ErrNonLoopbackListen, addr)
	}
	portNumber, err := strconv.Atoi(port)
	if err != nil || portNumber < 1 || portNumber > 65535 {
		return Config{}, fmt.Errorf("invalid listen port %q", port)
	}

	return Config{ListenAddress: addr}, nil
}

func isExplicitLoopback(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
