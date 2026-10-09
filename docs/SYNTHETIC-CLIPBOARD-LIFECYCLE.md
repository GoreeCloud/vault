# Synthetic clipboard clear lifecycle

**Status: Development-only exposure-clearing policy. It never reads, writes, inspects, stores, copies, or returns clipboard content.**

`src/synthetic-clipboard-lifecycle.mjs` models only what a client should propose after a caller claims a Vault-origin clipboard write. It has no API for authorizing a copy and never receives the copied value.

## Current behavior

For strict schema-version-0 fixture metadata, the module can propose:

- `clear-now` after the synthetic timeout boundary;
- `clear-now` when the caller claims the vault is locked, the app is backgrounded, or the context is private;
- `schedule-clear` while a bounded clear timeout is still pending; or
- `none` when no Vault-origin copy is claimed.

If the caller claims the platform cannot clear the clipboard, a Vault-origin copy state fails closed rather than proposing indefinite retention. Clear timeouts are restricted to 5-300 seconds.

## Security boundary

Every lifecycle fact is forgeable and this module performs no clipboard side effect. A successful result does not prove the system clipboard was cleared, that clipboard history or cross-device clipboard synchronization is disabled, or that another process has not already read the value. It rejects any added clipboard-content field and never returns content.

## Required platform implementation evidence

Real clients must use supported OS/browser clipboard APIs; document platform limitations; minimize copy availability; clear on lock/background where appropriate; test clipboard history and synchronization behavior; handle race conditions and process death; avoid logs/analytics/accessibility leakage; provide understandable UI; and validate target Android, iOS, desktop and browser runtimes under the exact security design.

This preflight does not authorize copying protected values and does not satisfy protected-clipboard, Glaze, Privacy Shield, or production security acceptance.
