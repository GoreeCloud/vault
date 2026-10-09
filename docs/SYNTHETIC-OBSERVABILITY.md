# Synthetic privacy-safe observability preflight

**Status: Development-only signal-shape model. It does not collect, log, persist, transmit, aggregate, or authorize telemetry.**

`src/synthetic-observability-signal.mjs` demonstrates a strict data-minimized operational vocabulary that contains no arbitrary strings and no user, tenant, vault, item, origin, URL, credential, device, session, token, error-message, or stack-trace identifiers.

## Bounded vocabulary

Synthetic signals are restricted to an enumerated category, outcome, coarse duration bucket, coarse retry bucket, coarse item-count bucket, and an offline boolean. Extra properties and raw numeric measurements fail closed. The successful screen result does not echo the supplied signal.

Current categories are deliberately generic: client health, sync-envelope handling, backup-envelope handling, and lock lifecycle. They describe operational classes rather than user content or credential activity.

## Privacy boundary

This shape alone does not make telemetry private or acceptable. Correlation, timing, transport metadata, IP addresses, device identifiers, retention, sampling, aggregation, operator access, and combinations of otherwise coarse events can still create privacy risk in a real system. No collection should be inferred or enabled from this prototype.

## Required production evidence

Any future Observability integration must be separately authorized and must demonstrate Privacy Shield and GoreeCloud Observability contract conformance; explicit collection purpose; data minimization; no decrypted vault content or protected-field leakage; no free-form secret-bearing exceptions; transport and storage controls; bounded retention; access controls; deletion behavior; offline behavior; correlation-risk analysis; hostile-input and logging tests; and representative runtime verification.

This preflight is a negative-design aid only. It does not establish telemetry consent, Privacy Shield conformance, Observability integration, or production monitoring.
