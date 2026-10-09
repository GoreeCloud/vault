# GoreeCloud Vault — profile switch fixture

Development-only. This module is a synthetic metadata screening experiment, not a profile manager, authentication service, lock controller, storage system, encryption implementation, or authorization decision.

The fixture consists of a bounded revision number, one active numeric slot and an ordered array of at most sixteen anonymous numeric profile slots. Each profile has a claimed mode, lock state and pending-edit count. The request proposes a different destination slot and the expected revision.

The preflight rejects unknown or repeated slots, stale revisions, malformed data, unlocked profiles, and unresolved edits. It returns only a frozen proposal describing required independent checks. The module never changes state.

Caller assertions are entirely untrusted. Input shape validation does not establish session authenticity or prove isolation. The future real implementation requires independently verified lock state, separate profile key custody and caches, session scope revalidation, pending-edit reconciliation, ephemeral UI cleanup, accessible presentation, recovery and representative browser/device security testing. Human review in GitHub issue #1 remains required. Track ongoing work in issue #3.
