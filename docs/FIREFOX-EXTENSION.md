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
