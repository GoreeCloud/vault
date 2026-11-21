# GoreeCloud Vault — Firefox Extension

**State:** Unsigned development preview with Firefox Manifest V3 source in `apps/firefox/`. Not published or independently audited.

## Build and temporary installation

Requires Node.js 24+, npm and a supported Firefox version (manifest minimum Firefox 142).

```sh
cd apps/firefox
npm ci --ignore-scripts
npm run build
npm test
npm run lint:extension
npm run package
# Browser-engine popup UI tests (mocked WebExtensions storage and tab APIs):
npx playwright install firefox
npm run test:e2e
```

To temporarily test locally, visit Firefox `about:debugging` → **This Firefox** → **Load Temporary Add-on** and choose `apps/firefox/dist/manifest.json`. Temporary add-ons are removed when Firefox restarts; production distribution requires Mozilla signing and separate acceptance.

## Permission and data boundaries

Manifest permissions: `storage` for an **encrypted** envelope in Firefox extension storage, `activeTab` for current-user-initiated access to one active tab, and `scripting` for isolated-world credential filling after explicit button click. **No `<all_urls>` permission, permanent content scripts, background listeners, analytics, or remote API calls.** The extension declares `data_collection_permissions.required=["none"]`.

All key derivation and AES-GCM encryption happen locally inside the popup. The master password and derived key exist only while the popup is open; closing the popup locks it. An open popup also locks after five minutes of inactivity; local pointer/keyboard/input events reset the timer. No plaintext secrets are persisted. The web app's localStorage and the extension's storage.local are intentionally separate: import an **encrypted** JSON export to transfer data between the two after confirming the destination and password. Do not import secrets on shared devices or untrusted profiles.

## Credential filling

1. Navigate to the login page over HTTPS, with an exact origin matching an entry's recorded website origin.
2. Open the extension, unlock it and choose the login entry.
3. Click **Fill current HTTPS site**.
4. The extension rereads the active tab URL and checks the URL origin again inside the injected content-script function before filling; it never automatically submits a form.

The injected function writes fields inside the **current top document** only, not cross-origin frames; it cannot guarantee correct operation on every website. A malicious site, compromised browser, altered form or injected page script may observe values after fill. No phishing-resistant guarantee is claimed from URL matching alone. Autofill is always optional and user-triggered.

## Supported encrypted records

After encrypted backup import, the popup returns to the locked state and requires the imported master password.

The extension can create and read logins, secure notes, TOTP/HOTP authenticators and passkey **references**, and read custom encrypted fields from imported vaults. The popup editor supports tags, favorites, and encrypted custom field names/values with explicit conceal/reveal controls. Its feature coverage still requires real-browser review. The OTP secret, like every other record field, remains encrypted at rest.

New passkey-reference metadata is checked against a Public Suffix List-aware domain parser. It does not establish site ownership, private key custody, or WebAuthn authentication.

**Passkey references are not passkey sign-in.** Firefox's WebAuthn/passkey integration is a separate browser/OS authenticator boundary; full management must not be claimed until WebAuthn registration and assertion are explicitly tested against real relying parties.

## Security and release acceptance

Before a signed release: audit dependencies and generated bundle, manually test temporary installation, verify exact-origin autofill and navigation races, test import/export/backup recovery, validate accessibility, verify no data transmission, obtain appropriate extension signing, document update/rollback and test on supported Firefox versions. The React runtime can trigger Mozilla linter warnings for internal `innerHTML` assignment; app code does not intentionally call `dangerouslySetInnerHTML`. Review these warnings and generated source, not just linter exit status.


## Validation evidence

Automated popup UI tests run in the Playwright Firefox browser engine with
an in-memory mocked WebExtensions API. They cover encrypted note save/lock/
unlock and user-triggered exact-HTTPS-origin fill argument construction. The
WebExtensions runtime add-on has also been temporarily installed in a fresh
Firefox 159 headless profile through `web-ext run`, with an installation success
message. This is **not** end-to-end verification of live in-tab injection,
browser permission handling, autofill phishing resistance, popup on-screen
rendering, or a signed AMO distribution. Treat the mocked test and temporary
add-on installation as separate evidence categories.


## Bitwarden migration

When unlocked, the popup supports a local, user-confirmed Bitwarden **plaintext JSON** login/note import using the same bounded parser as the web client. No plaintext is stored by the extension; the result is immediately encrypted under the current local vault. Unsupported data, including real passkey private keys, attachments and identities, is **not** migrated. See [migration details](IMPORTING-BITWARDEN.md). The Firefox extension still has only the three minimal existing permissions.


## Asynchronous operation safety

The popup invalidates an in-memory session epoch whenever the user locks it or
the five-minute inactivity timer expires. Pending master-key derivation,
encrypted record writes, Bitwarden migration, backup restore, OTP generation and
active-tab autofill recheck the epoch before exposing decrypted data or invoking
credential injection. A delayed storage write that was already dispatched may
still finish, but it **must not reopen** the session. The unlock form
remains disabled until that in-flight write resolves, preventing a concurrent
unlock from observing an older ciphertext snapshot. A later explicit unlock
reads the current encrypted storage snapshot rather than trusting cached data.

Automated synthetic Firefox popup tests exercise a deliberately delayed
extension-storage write across the inactivity lock and a fresh unlock.
This is not a general guarantee of atomic multi-window writes, OS memory
zeroization, or protection against malicious privileged extensions.

## Proton Pass migration (limited)

The popup can also parse a manually extracted **plaintext Proton Pass data.json** file into encrypted personal login/note records after user consent and a count-only omission preview. It does not import ZIP archives, PGP ciphertext, CSV, alias forwarding, attachments or usable passkeys. A source plaintext file remains on the user's disk. See [Proton import boundaries](IMPORTING-PROTON-PASS.md) and do not assume user exports are fully portable.

## Visible-field and form-ambiguity safety

The manually initiated in-tab fill helper refuses invisible, inert,
disabled, read-only, disconnected, or zero-area password fields and pages
with multiple visible password controls. It excludes signup/new-password
controls and refuses multiple candidate usernames in the selected password
form. It never submits or fills cross-origin frames. This protects against
accidental template/honeypot selection but cannot prevent a malicious
same-origin website from observing a password after an intentional fill.
Automated DOM fixture tests are not a signed Firefox add-on acceptance test.
