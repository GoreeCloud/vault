# GoreeCloud Vault CLI — development endpoint safeguards

**Development only; not production network isolation.** Partial remediation of issue #18.

The imported DefaultEnvironmentService defaults to the vendor's US cloud region. The CLI previously allowed remote commands with this configuration.

Changes: Remote-command entry points now reject the default cloud environment. The config server command requires an explicit development base URL and refuses vendor-controlled hosts, unencrypted remote URLs, embedded URL credentials, and an absent configuration. Disposable-profile local CLI and Jest tests run in the OSS CI build.

Limitations: This is an application command gate AFTER service-container initialization, not a network-level egress firewall. Background initialization, SDK transports, redirects, Send links, desktop IPC, browser and web applications must be reviewed independently. A user-configured HTTPS hostname is not proof of GoreeCloud service ownership. Never use live credentials, approve a Stable release, or claim comprehensive transport safety based on this guard.

Next: Create a reviewed service identity/tenant allowlist and centralized transport restriction, verify all network call paths using synthetic localhost tests, and obtain qualified cryptographic, node-forge, key custody, recovery, Firefox and installed-device acceptance.