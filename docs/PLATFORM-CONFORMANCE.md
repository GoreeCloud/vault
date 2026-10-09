# Nine Integral Platform Systems — applicability matrix

Every system is evaluated. **All following integrations are planned or unverified**, not implemented by the source import.

| System | Vault responsibility | Status / evidence needed |
| --- | --- | --- |
| GoreeCloud Manager | Managed self-host instances, enrollment and lifecycle only with scoped authority | Planned; service-control contract |
| Privacy Shield | Data minimization, disclosure limits, local-only/private-context behavior | Planned; approved privacy flow + tests |
| Wardveil Security | Risk signals, phishing detection, policy evidence and response | Planned; enforce at appropriate owner and test |
| Everkeep | Encrypted backup and independently verified restore | Development metadata preflight exists; no Everkeep request, backup bytes, encryption, storage or restore runtime. Planned; authenticated recovery contract + drills |
| Glaze | Current controls, tokens, icon identity and accessibility | Planned; UI acceptance |
| GoreeCloud Mesh | Authorized discovery and encrypted, authenticated coordination | Planned; service contract |
| GoreeCloud Identity | Identity/session authority; **never plaintext vault key custody** | Development lock-lifecycle fixture models fail-closed session/device claims only; no Identity integration. Planned; isolation, authoritative reauth and revocation tests |
| GoreeCloud Policy | Explicit policy decisions, user consent and audit boundaries | Development lock-lifecycle fixture accepts no authoritative policy evidence. Planned; policy conformance |
| GoreeCloud Observability | Health/latency/error metrics without credentials | Development identifier-free coarse signal-shape preflight exists; no collection/transmission. Planned; Privacy Shield review + scrubbed data-flow evidence |

GoreeCloud Sync is separately governed, not a tenth Integral System. Optional first-party connections to GoreeCloud AI, Drive, Browser, Search, Code and Launcher must be scoped and cannot defeat zero-knowledge or grant AI unrestricted secret access.
