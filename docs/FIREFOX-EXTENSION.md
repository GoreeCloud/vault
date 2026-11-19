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
```

To temporarily test locally, visit Firefox `about:debugging` → **This Firefox** → **Load Temporary Add-on** and choose `apps/firefox/dist/manifest.json`. Temporary add-ons are removed when Firefox restarts; production distribution requires Mozilla signing and separate acceptance.

## Permission and data boundaries

Manifest permissions: `storage` for an **encrypted** envelope in Firefox extension storage, `activeTab` for current-user-initiated access to one active tab, and `scripting` for isolated-world credential filling after explicit button click. **No `<all_urls>` permission, permanent content scripts, background listeners, analytics, or remote API calls.** The extension declares `data_collection_permissions.required=["none"]`.

All key derivation and AES-GCM encryption happen locally inside the popup. The master password and derived key exist only while the popup is open; closing the popup locks it. No plaintext secrets are persisted. The web app's localStorage and the extension's storage.local are intentionally separate: import an **encrypted** JSON export to transfer data between the two after confirming the destination and password. Do not import secrets on shared devices or untrusted profiles.

## Credential filling

1. Navigate to the login page over HTTPS, with an exact origin matching an entry's recorded website origin.
2. Open the extension, unlock it and choose the login entry.
3. Click **Fill current HTTPS site**.
4. The extension rereads the active tab URL and checks the URL origin again inside the injected content-script function before filling; it never automatically submits a form.

The injected function writes fields inside the **current top document** only, not cross-origin frames; it cannot guarantee correct operation on every website. A malicious site, compromised browser, altered form or injected page script may observe values after fill. No phishing-resistant guarantee is claimed from URL matching alone. Autofill is always optional and user-triggered.

## Supported encrypted records

The extension can create and read logins, secure notes, TOTP/HOTP authenticators and passkey **references**, and read custom encrypted fields from imported vaults. The current popup editor does not yet expose every native/web custom-field editing control. The OTP secret, like every other record field, remains encrypted at rest.

**Passkey references are not passkey sign-in.** Firefox's WebAuthn/passkey integration is a separate browser/OS authenticator boundary; full management must not be claimed until WebAuthn registration and assertion are explicitly tested against real relying parties.

## Security and release acceptance

Before a signed release: audit dependencies and generated bundle, manually test temporary installation, verify exact-origin autofill and navigation races, test import/export/backup recovery, validate accessibility, verify no data transmission, obtain appropriate extension signing, document update/rollback and test on supported Firefox versions. The React runtime can trigger Mozilla linter warnings for internal `innerHTML` assignment; app code does not intentionally call `dangerouslySetInnerHTML`. Review these warnings and generated source, not just linter exit status.
