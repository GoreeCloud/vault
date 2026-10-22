# GoreeCloud Vault — native development loopback browser boundary

**Development only. Not a password manager, not a reverse proxy or authentication system.**

The native Go foundation binds to a literal loopback address. Its actual
listener checks each incoming HTTP Host against the bound port and accepts
only the literal bound address or `localhost`. All other authorities receive
HTTP 421. `Forwarded` and `X-Forwarded-*` never grant trust.

Browser requests with an `Origin` must originate from the **same** literal
HTTP origin, with no username, path, query or fragment. Off-origin requests,
`Origin: null`, and duplicated Origin headers receive HTTP 403. Requests
without an Origin may support local command-line health probes, **not**
authentication. This layer adds defense in depth against DNS rebinding and
unauthorized browser origins; it is not proof of cross-site-request security
for a future state-changing API. Do not enable cookies or real credentials.

Only process liveness can return HTTP 200. `/readyz` and every identity,
encrypted-item or sync route remain HTTP 503 (`ready:false`). The server is
not configured behind Caddy or at `vault-dev.goreecloud.com`. The original
Docker Vaultwarden service at `vault.goreecloud.com` is a separate system
and must not be changed by this patch.

Before merging: build on exact source Go 1.24; run `go test -race ./...`,
`go vet ./...`, repository Python regression checks, and all five inherited
OSS client build targets on the exact PR head. Test real loopback socket
requests, no secrets, and preserve rollback using the parent Git revision.
