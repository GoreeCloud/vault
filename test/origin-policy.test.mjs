import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSecureOrigin, isExactOriginMatch } from "../src/origin-policy.mjs";

test("only HTTPS secure origins are accepted", () => {
  assert.equal(canonicalSecureOrigin("https://example.org/login?return=1"), "https://example.org");
  for (const bad of ["", "http://example.org", "javascript:alert(1)", "file:///tmp/secret", "not a URL", "https://user:password@example.org"]) {
    assert.equal(canonicalSecureOrigin(bad), null);
  }
});
test("strict matching prevents subdomain and deceptive-origin autofill", () => {
  assert.equal(isExactOriginMatch("https://example.org/login", "https://example.org/account"), true);
  assert.equal(isExactOriginMatch("https://example.org", "https://login.example.org"), false);
  assert.equal(isExactOriginMatch("https://example.org", "https://example.org.evil.test"), false);
  assert.equal(isExactOriginMatch("https://example.org", "http://example.org"), false);
  assert.equal(isExactOriginMatch("https://example.org", "https://example.org:8443"), false);
  assert.equal(isExactOriginMatch(null, null), false);
});
test("canonicalizes default HTTPS port without wildcard expansion", () => {
  assert.equal(isExactOriginMatch("https://example.org:443/login", "https://example.org"), true);
});

test("rejects origin-ambiguous backslashes and URL-parser-normalized controls", () => {
  for (const value of [
    "https://example.org\\@other.invalid/",
    " https://example.org",
    "https://example.org\\login",
    "https://example.org\n",
    "https://example.org\t",
    "https://example.org\u007f"
  ]) {
    assert.equal(canonicalSecureOrigin(value), null);
  }
  assert.equal(canonicalSecureOrigin("https://example.org/path%20with%20spaces"), "https://example.org");
});
