# GoreeCloud Vault — Features

| Capability | Status | Evidence or limitation |
| --- | --- | --- |
| Browser app | Source implemented / build tested | React 19 + TypeScript |
| Linux graphical application | Source implemented / static and crypto tests | Flutter native, representative runtime and packaging pending |
| Android application | Source implemented / static and crypto tests | Flutter native Android runner; device install pending |
| Local authenticated encryption | Implemented / synthetic tests | AES-256-GCM; PBKDF2-HMAC-SHA-256; no cryptographic audit |
| Master password create/unlock | Implemented in source | No password recovery |
| Login CRUD, search, random password generation | Implemented in source | User interaction, accessibility and persistence not yet fully runtime-tested |
| Browser encrypted JSON export | Implemented in source | Restore/import not implemented |
| Native encrypted local file | Implemented in source | Data durability/restore/device checks pending |
| Cross-platform fixture | Synthetic test fixture | Real end-to-end migration checks pending |
| Cloud sync, sharing, autofill, passkeys, TOTP, aliases | Not implemented | Requires separately reviewed security architecture |
| Signed release and deployment | Not verified | Do not treat development builds as production |
