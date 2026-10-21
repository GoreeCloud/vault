#!/usr/bin/env python3
"""Read-only, credential-free preflight for the private Vault development hostname.

The probe never authenticates, sends secret-bearing headers, follows redirects,
or modifies DNS, TLS, proxies or services. A pass verifies transport only.
"""
import argparse
import ipaddress
import json
import re
import socket
import ssl
from dataclasses import dataclass

DEV_HOST = "vault-dev.goreecloud.com"
NOTICE = (
    "Transport evidence only: not backend ownership, isolated storage, "
    "cryptography, tenancy, recovery, or production authorization."
)


@dataclass(frozen=True)
class Result:
    status: str
    reason: str
    dns_addresses: tuple[str, ...] = ()
    http_status: int | None = None

    def as_dict(self) -> dict:
        return {
            "hostname": DEV_HOST,
            "status": self.status,
            "reason": self.reason,
            "dns_addresses": list(self.dns_addresses),
            "http_status": self.http_status,
            "scope": NOTICE,
        }


def probe(expected_ip: str, timeout: float = 5.0) -> Result:
    try:
        expected = str(ipaddress.IPv4Address(expected_ip))
    except ipaddress.AddressValueError:
        return Result("blocked", "invalid_expected_ipv4")

    # Limit probing to the explicitly documented private overlay network.
    if ipaddress.IPv4Address(expected) not in ipaddress.IPv4Network("100.64.0.0/10"):
        return Result("blocked", "expected_ip_not_private_overlay")
    if not 0 < timeout <= 10:
        return Result("blocked", "invalid_timeout")

    try:
        records = socket.getaddrinfo(DEV_HOST, 443, socket.AF_INET, socket.SOCK_STREAM)
        addresses = tuple(sorted({record[4][0] for record in records}))
    except (OSError, IndexError, ValueError):
        return Result("blocked", "dns_lookup_failed")

    if addresses != (expected,):
        return Result("blocked", "dns_mismatch", addresses)

    # Connect to the verified IP rather than resolving again after the DNS check.
    # The actual TLS peer must present a publicly trusted certificate for DEV_HOST.
    request = (
        f"HEAD / HTTP/1.1\r\nHost: {DEV_HOST}\r\n"
        "User-Agent: GoreeCloud-Vault-Development-Preflight/1\r\n"
        "Connection: close\r\n\r\n"
    ).encode("ascii")
    try:
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        with socket.create_connection((expected, 443), timeout=timeout) as plain:
            with context.wrap_socket(plain, server_hostname=DEV_HOST) as secure:
                secure.settimeout(timeout)
                secure.sendall(request)
                # Only the HTTP status line is read; no secrets or bodies.
                status_line = secure.makefile("rb").readline(256)
    except (OSError, ssl.SSLError, TimeoutError):
        return Result("blocked", "tls_or_https_connection_failed", addresses)

    match = re.fullmatch(rb"HTTP/1\.[01] ([1-5][0-9]{2})(?: [^\r\n]*)?\r?\n", status_line)
    if not match:
        return Result("blocked", "malformed_https_status_line", addresses)
    http_status = int(match.group(1))
    if 300 <= http_status < 400:
        return Result("blocked", "https_redirect_not_followed", addresses, http_status)
    if 200 <= http_status < 300 or http_status in (401, 403):
        return Result("transport_verified", "dns_tls_and_http_reachable", addresses, http_status)
    return Result("blocked", "http_response_not_healthy", addresses, http_status)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--expected-ip",
        required=True,
        help="Explicit expected 100.64.0.0/10 private overlay IPv4, e.g. 100.71.27.119",
    )
    parser.add_argument("--timeout", type=float, default=5.0, help="Seconds, maximum 10")
    args = parser.parse_args()
    result = probe(args.expected_ip, args.timeout)
    print(json.dumps(result.as_dict(), sort_keys=True))
    return 0 if result.status == "transport_verified" else 2


if __name__ == "__main__":
    raise SystemExit(main())
