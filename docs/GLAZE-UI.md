# GoreeCloud Vault Server — Glaze UI

## Purpose and authority

Every GoreeCloud-controlled Vault interface must follow the current applicable Stable **Glaze UI** contract. Glaze UI is an authoritative product requirement, not a cosmetic skin and not a substitute for security, privacy, authorization, or accessibility evidence.

The current product identity is **GoreeCloud Vault**. The former GoreeVault identity is retired and must not appear as current controlled presentation. Historical and compatibility-sensitive implementation identifiers may remain only where a controlled migration is safer than immediate replacement.

The canonical product-family repository is `GoreeCloud/goreecloud-vault`. It may contain Vault Server, Vault Web, and supported client components, but shared source control does not make one component's Glaze UI evidence or release acceptance valid for another component.

## GoreeCloud-controlled server surfaces

Server administration pages, authentication/error presentation owned by the Vault Server component, transactional email, and future server-owned presentation must use GoreeCloud Vault or GoreeCloud Vault Server as appropriate.

Current transactional email is shared product presentation and therefore uses **GoreeCloud Vault**. Email presentation must remain readable without images, use local/text identity, avoid tracking pixels, remote scripts, remote fonts, analytics resources, and unnecessary sensitive detail.

## Transitional compatibility surface

The bundled Bitwarden-compatible web vault is a **temporary development divergence** used for compatibility while **GoreeCloud Vault Web** is developed and accepted. It is not a permanent production exception. **No production Glaze UI exception is approved** by this repository.

Stable product readiness is blocked until the primary supported browser vault is GoreeCloud-owned and passes the current applicable Glaze UI, accessibility, privacy, security, compatibility, migration, and release gates, unless an explicit governed exception is separately approved.

## Current source structure

- `src/static/templates/admin/base.hbs` — server administration shell.
- `src/static/scripts/admin.css` and `admin.js` — server-owned presentation and local appearance behavior.
- `src/static/templates/404.hbs` and `src/static/scripts/404.css` — server-owned error presentation.
- `src/static/templates/email/email_header.hbs`, `email_footer.hbs`, and `email_footer_text.hbs` — GoreeCloud Vault transactional presentation.
- `web-client/` — in-repository GoreeCloud Vault Web development boundary with independent browser-client acceptance requirements.
- `scripts/validate-glaze-ui.py` — source-level presentation checks.

The existing local-storage key `goreecloud-goreevault-theme` is a compatibility-era identifier retained temporarily to avoid unnecessary local preference loss. It is not current product identity, is not sent to the server, and must be migrated only through a controlled compatibility-safe change.

## Accessibility and interaction

Controlled browser presentation must preserve semantic landmarks, keyboard-accessible skip navigation, visible focus, practical minimum 44-pixel targets, readable contrast, reduced-motion support, increased-contrast behavior, forced-colors operability, solid fallbacks when translucency is unavailable, and text-based status/error meaning.

## Privacy and security boundaries

Glaze presentation must not introduce remote scripts, fonts, stylesheets, tracking, advertising, behavioral analytics, or externally hosted branding dependencies into normal controlled surfaces. Presentation changes must not weaken authentication, authorization, CSRF/cookie protections, zero-knowledge behavior, API compatibility, cryptography, migrations, organization/collection permissions, email action semantics, or network controls.

## Automated conformance

Run:

```bash
python3 scripts/validate-glaze-ui.py
python3 scripts/validate-repository-readiness.py
```

Source checks verify current GoreeCloud Vault identity on controlled presentation, local dependencies, privacy metadata, accessibility fallbacks, compatible appearance behavior, removal of active Vaultwarden/retired-product presentation, and preservation of the Stable blocker. Automated source checks do not establish current product-wide Glaze UI 1.3.0 acceptance; representative rendered/runtime validation remains required.
