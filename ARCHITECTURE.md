# GoreeCloud Vault — Architecture

## Status

Development architecture baseline. This document describes the accepted source boundary for the initial repository foundation. It does not establish credential-storage, encryption, authentication, synchronization, browser integration, release, deployment, or Stable status.

## Role and purpose

GoreeCloud Vault is the planned authoritative GoreeCloud system for protected credentials, passkeys, authentication secrets, secure autofill material, identities, and application secrets. Other GoreeCloud applications may request authorized Vault operations but must not become competing credential authorities.

## Foundation 0.1 source boundary

The initial executable foundation is intentionally narrow:

- one Go service entry point at `cmd/goreecloud-vault`;
- configuration that accepts only explicit loopback listen addresses;
- `/healthz` and `/readyz` operational endpoints;
- bounded HTTP server timeouts and header size;
- graceful process shutdown;
- no credential, passkey, TOTP, identity, payment, secret, sharing, synchronization, import/export, administrative, or browser APIs;
- no persistent storage;
- no cryptographic implementation;
- no authentication or authorization implementation;
- no public or private-network listener support;
- no telemetry or request logging middleware.

This boundary is deliberate. Vault handles unusually sensitive data, so storage, key hierarchy, unlock flows, authentication, synchronization, sharing, recovery, and browser/client protocols require dedicated threat modeling and review before source implementation.

## Planned architectural layers

Future implementation is expected to separate responsibilities into explicit layers rather than allowing clients or integrations to reach protected storage directly:

1. **Client surfaces** — web, native browser, browser extension, desktop/mobile, CLI, and approved GoreeCloud applications.
2. **Vault capability API** — versioned operations such as search, fill, generate, create, update, share, unlock, reauthenticate, and secret retrieval.
3. **Authorization and policy** — principal, device, session, organization, capability, purpose, and policy evaluation.
4. **Protected record domain** — record types, vault membership, collections, history, sharing state, and lifecycle.
5. **Cryptographic boundary** — reviewed key derivation, envelope encryption, authenticated encryption, passkey protection, device secrets, and recovery material using established libraries and protocols.
6. **Persistence and synchronization** — encrypted authoritative state, local protected caches, conflict handling, offline operation, and synchronization evidence.
7. **Platform integrations** — Privacy Shield, Wardveil Security, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Policy, GoreeCloud Observability, GoreeCloud Manager, and Glaze UI where applicable.

## Trust boundaries

The following boundaries are security significant:

- untrusted browser/page content versus Vault-controlled credential operations;
- locked versus unlocked Vault state;
- authenticated identity versus authorized secret operation;
- one account, vault, organization, or profile versus another;
- client cache versus authoritative protected Vault state;
- device-local protection versus synchronized encrypted material;
- human credentials versus machine/application secrets;
- private Vault records versus organization-controlled shared records;
- ordinary operations versus emergency/break-glass or administrative operations;
- GoreeCloud Vault versus external providers and imported/exported plaintext formats.

## Exposure model

Foundation 0.1 is loopback-only and fails closed for non-loopback listen addresses. Network exposure through GoreeCloud Gateway, GoreeCloud Network, containers, reverse proxies, or other infrastructure is not authorized by this foundation and requires a later governed design and validation stage.

## Cryptography rule

Vault will use established cryptographic libraries and reviewed constructions. The project must not create custom cryptographic primitives. Algorithm selection, key derivation, key hierarchy, recovery, rotation, device binding, and synchronization constructions require explicit design review and tests before implementation is promoted as secure.

## Evidence rule

Source presence is not production evidence. Implementation claims require exact-revision source, tests, applicable security/privacy review, integration evidence, and target-environment validation appropriate to the claim.
