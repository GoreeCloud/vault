# Fork-to-Native transition: milestones, evidence and exit criteria

| Phase | Work | Acceptance gate |
| --- | --- | --- |
| F0: source baseline | Source-locked server/client snapshots; commercial-only modules excluded; licensing and upstream notices | Check script and provenance readback |
| F1: architecture | Threat model; domain/data/identity contracts; source/license audit; security review | Human approved trust boundary for exact revision |
| F2: secure core | Synthetic client-private item templates, non-authoritative tenant/role screening, and no-storage offline queue sequencing exist; real native item storage, permission engine, approved encrypted client/server protocols and migration adapters remain unimplemented | Human-approved crypto and real isolation test suites |
| F3: experience | Glaze web/desktop/extension/native browser; Android and iOS credential providers; accessible onboarding | Device/browser/accessibility suites |
| F4: ecosystem | Nine Integral Systems and optional bounded GoreeCloud app integrations | Contract, privacy and failure-mode tests |
| F5: migration | Verified import/export, backup restore, previous format compatibility, reversible cutover | End-to-end migration and rollback on representative vaults |
| F6: native acceptance | Remove upstream runtime shells, maintain upstream acknowledgements and license obligations; architecture audit | Exact-head CI, security, license, user acceptance, release and operations gates |

**Exit definition:** GoreeCloud Vault's product-defining implementation, UX, policy, encryption trust model, authorization, service control, storage contracts, and first-party integrations no longer depend on an inherited Bitwarden application shell. Protocol and library compatibility may remain when narrowly justified and license-compliant. This cannot be claimed until evidenced by source audits and production-like testing.

**Open:** User-facing server and clients, mobile native repositories, full passkey lifecycle, encrypted file attachments, org sharing, disaster recovery, tenant isolation, strong auth, build automation and full application testing. Active work is tracked in current repository issue #3 and blocking security issue #1; the current canonical DOCX task record exists in GoreeCloud/Tasks Management; keep it current with verified revisions. No old PR, issue or CI result may be mistaken for a current one.

## Recommendations

Prioritize hardened self-hosted **single-user encrypted sync + reliable backups** before shared organizations, enterprise secrets, and AI access. Keep passkeys WebAuthn standards-compliant, default to exact-origin-only autofill, provide an offline-first client, make privacy-preserving import/export a first-class feature, and conduct an independent security/cryptographic audit before beta use with live credentials. Stage rebranding and Glaze migration independently from cryptographic changes so regressions can be isolated.
