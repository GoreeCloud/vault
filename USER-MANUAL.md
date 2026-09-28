# GoreeCloud Vault — User Manual

## Current Development use

GoreeCloud Vault is not yet an end-user password manager or secrets service. The current executable is a loopback-only Development foundation intended for engineering validation.

Run source checks with:

```bash
go test ./...
go vet ./...
go build ./cmd/goreecloud-vault
```

Running `go run ./cmd/goreecloud-vault` starts the Development service on `127.0.0.1:8787` by default and exposes only operational health/readiness endpoints.

## Security boundary

Do not enter, import, or test with real credentials, passkeys, TOTP seeds, private keys, tokens, recovery secrets, or production Vault data. Protected secret persistence remains blocked pending the human security review tracked in GitHub issue #4.
