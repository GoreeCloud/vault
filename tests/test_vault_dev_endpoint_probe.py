"""Offline synthetic tests for the private Vault development endpoint probe."""
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/check_vault_dev_endpoint.py"
spec = importlib.util.spec_from_file_location("vault_dev_endpoint_probe", SCRIPT)
module = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class FakeConnection:
    def __init__(self, status=200):
        self.status = status
        self.sent = b""
        self.timeout = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def settimeout(self, value):
        self.timeout = value

    def sendall(self, payload):
        self.sent = payload

    def makefile(self, *_):
        return io.BytesIO(f"HTTP/1.1 {self.status} Synthetic\r\n".encode())


class FakeContext:
    def __init__(self, connection):
        self.connection = connection
        self.sni = None
        self.minimum_version = None

    def wrap_socket(self, _, server_hostname):
        self.sni = server_hostname
        return self.connection


class VaultDevProbeTests(unittest.TestCase):
    def test_dns_drift_blocks_before_any_connection(self):
        with patch.object(module.socket, "getaddrinfo", return_value=[
            (2, 1, 0, "", ("100.71.27.120", 443))
        ]), patch.object(module.socket, "create_connection") as connect:
            result = module.probe("100.71.27.119")
        self.assertEqual(result.reason, "dns_mismatch")
        connect.assert_not_called()

    def test_private_overlay_and_input_are_mandatory(self):
        for ip in ("1.1.1.1", "192.168.1.1", "bogus"):
            with self.subTest(ip=ip), patch.object(module.socket, "getaddrinfo") as dns:
                self.assertEqual(module.probe(ip).status, "blocked")
                dns.assert_not_called()

    def test_valid_tls_uses_verified_ip_and_sni_with_only_head(self):
        conn = FakeConnection(200)
        tls = FakeContext(conn)
        with patch.object(module.socket, "getaddrinfo", return_value=[
            (2, 1, 0, "", ("100.71.27.119", 443))
        ]), patch.object(module.socket, "create_connection", return_value=FakeConnection()) as connect, patch.object(
            module.ssl, "create_default_context", return_value=tls
        ):
            result = module.probe("100.71.27.119")
        self.assertEqual(result.status, "transport_verified")
        connect.assert_called_once_with(("100.71.27.119", 443), timeout=5.0)
        self.assertEqual(tls.sni, module.DEV_HOST)
        self.assertIn(b"HEAD / HTTP/1.1\r\n", conn.sent)
        self.assertNotIn(b"Authorization:", conn.sent)
        self.assertNotIn(b"Cookie:", conn.sent)

    def test_tls_failure_is_sanitized(self):
        with patch.object(module.socket, "getaddrinfo", return_value=[
            (2, 1, 0, "", ("100.71.27.119", 443))
        ]), patch.object(module.socket, "create_connection", side_effect=OSError("private detail")):
            result = module.probe("100.71.27.119")
        self.assertEqual(result.reason, "tls_or_https_connection_failed")
        self.assertNotIn("private detail", str(result.as_dict()))

    def test_redirect_is_not_followed(self):
        for status, expected in [(302, "https_redirect_not_followed"), (503, "http_response_not_healthy"), (401, "dns_tls_and_http_reachable")]:
            conn = FakeConnection(status)
            with self.subTest(status=status), patch.object(module.socket, "getaddrinfo", return_value=[
                (2, 1, 0, "", ("100.71.27.119", 443))
            ]), patch.object(module.socket, "create_connection", return_value=FakeConnection()), patch.object(
                module.ssl, "create_default_context", return_value=FakeContext(conn)
            ):
                result = module.probe("100.71.27.119")
            self.assertEqual(result.reason, expected)

    def test_workflow_runs_offline_guards(self):
        workflow = (ROOT / ".github/workflows/fork-integrity.yml").read_text()
        self.assertIn("test_vault_dev_endpoint_probe.py", workflow)


if __name__ == "__main__":
    unittest.main()
