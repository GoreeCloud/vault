# GoreeCloud Vault — Native development server foundation

**Development-only. No real secrets, no identities, no encrypted-item storage, no sync.**

The GoreeCloud Vault repository currently contains imported client code, not a
verified replacement server. This separate, native Go service process provides
a minimal readiness/capability endpoint and hard denials for identity,
credential, and synchronization operations. It is NOT yet a functional
password vault or a Vaultwarden substitute.

Run from this directory using Go 1.24 or later:

    go test -race ./...
    go vet ./...
    go run .

The server only binds 127.0.0.1:8187 by default. It rejects wildcard and
private-overlay bind addresses. The only successful response paths are
GET/HEAD /healthz and GET/HEAD /v1/dev/capabilities, which disclose that
credential storage, encrypted sync, and persisted storage are disabled.
Identity, account, item and sync API routes return 503, not fabricated success. These include direct root-relative client paths such as /accounts, /ciphers, /sync, /folders and /organizations; malformed slash paths are rejected without HTTP redirects.
There is no data store or default account. No secrets, auth headers or request
bodies are logged or echoed. This foundation neither opens public ports nor
modifies production Vaultwarden, NetBird, Caddy, or DNS.

Acceptance blockers before full functionality: specify the identity authority,
client-side encrypted storage contract, key custody, protocol interop with
the imported Vault clients, per-user/tenant isolation, revisions/conflict
handling, recovery and migration; implement with synthetic fixtures and
security review. Native Linux install, lifecycle, storage and secure deployment
also need further work. An HTTP health response does not prove any of these.

The production Vaultwarden instance at vault.goreecloud.com is a **separate**
Docker deployment and source of existing user data. The new replacement
target is vault-dev.goreecloud.com; it is not deployed by this change and
must never point at existing Vaultwarden data. See issues #3, #8, #25, #28.
