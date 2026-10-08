# Nine Integral Platform Systems — applicability matrix

Every system is evaluated. **All following integrations are planned or unverified**, not implemented by the source import.

| System | Vault responsibility | Status / evidence needed |
| --- | --- | --- |
| GoreeCloud Manager | Managed self-host instances, enrollment and lifecycle only with scoped authority | Planned; service-control contract |
| Privacy Shield | Data minimization, disclosure limits, local-only/private-context behavior | Planned; approved privacy flow + tests |
| Wardveil Security | Risk signals, phishing detection, policy evidence and response | Planned; enforce at appropriate owner and test |
| Everkeep | Encrypted backup and independently verified restore | Planned; recovery drills |
| Glaze | Current controls, tokens, icon identity and accessibility | Planned; UI acceptance |
| GoreeCloud Mesh | Authorized discovery and encrypted, authenticated coordination | Planned; service contract |
| GoreeCloud Identity | Identity/session authority; **never plaintext vault key custody** | Planned; isolation and revocation tests |
| GoreeCloud Policy | Explicit policy decisions, user consent and audit boundaries | Planned; policy conformance |
| GoreeCloud Observability | Health/latency/error metrics without credentials | Planned; scrubbed data-flow evidence |

GoreeCloud Sync is separately governed, not a tenth Integral System. Optional first-party connections to GoreeCloud AI, Drive, Browser, Search, Code and Launcher must be scoped and cannot defeat zero-knowledge or grant AI unrestricted secret access.
