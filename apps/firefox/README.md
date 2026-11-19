# GoreeCloud Vault Firefox Extension

Development-stage Firefox Manifest V3 React popup with local encrypted vault, five-minute idle locking, OTP, notes, editable encrypted custom fields/tags/favorites, passkey references, and user-triggered exact-origin credential fill. **Not an audited, signed or store-published add-on.** No server, passive page monitoring, or broad host permission.

Run `npm ci --ignore-scripts && npm run build && npm test && npm run lint:extension && npm run package`. Temporarily load `dist/manifest.json` using `about:debugging` in Firefox 142+. No production signing has been performed.

For requirements, threats, safe autofill behavior, limitations, passkey boundaries and deployment steps see [the canonical extension documentation](../../docs/FIREFOX-EXTENSION.md).

Original app source is AGPL-3.0-only; React and other third-party components retain their own notices in [THIRD-PARTY-NOTICES.md](../../docs/THIRD-PARTY-NOTICES.md).
