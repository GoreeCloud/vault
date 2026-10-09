# Synthetic lock and reauthentication lifecycle

**Status: Development-only policy preflight. Not an unlock mechanism, authentication service, biometric verifier, key manager, or production session controller.**

`src/synthetic-lock-lifecycle.mjs` models a deliberately small, fail-closed vocabulary for proposed lock-state transitions using fabricated caller-supplied facts. It contains no passwords, encryption keys, biometric data, device credentials, cookies, tokens, persistence, IPC, OS keystore access, or network calls.

## What the preflight demonstrates

The fixture model can conservatively propose a locked state when a synthetic session is unavailable or revoked, a device is unapproved, the app moves to the background, a user explicitly locks, or an idle timeout is reached. A synthetic unlock proposal is possible only for an already locked state when the caller claims a fresh reauthentication event.

Every input is untrusted. A caller can forge `sessionActive`, `deviceApproved`, `reauthFresh`, presence age, and every other field. Therefore `candidate: true` is only a test result and must never cause a real vault unlock, expose a key, authorize a credential operation, or extend a real session.

## Deliberate safety boundaries

- Schema version 0 is an unshippable fixture vocabulary.
- The result contains only a proposed next state and bounded reason.
- Unknown fields, unsupported values, accessors, unusual prototypes, and hostile proxies fail closed.
- Background, revocation, device loss, and explicit lock events do not attempt recovery or silent unlock.
- No remembered secret, PIN, biometric assertion, passkey assertion, or device proof is accepted.
- No lock state is persisted and no timer is installed by this module.

## Required production evidence

A real implementation still requires exact-revision human security review; authoritative GoreeCloud Identity and Policy session/revocation contracts where applicable; reviewed device and OS-protected key custody; platform-native biometric/credential APIs; foreground/background and crash recovery behavior; inactivity policy; screenshot, clipboard, notification and accessibility protections; clock/race testing; representative desktop/mobile/browser behavior; and verified rollback.

This preflight does not satisfy issue #1, does not authorize secret persistence, and does not establish Glaze, Identity, Policy, Wardveil, Privacy Shield, or platform conformance.
