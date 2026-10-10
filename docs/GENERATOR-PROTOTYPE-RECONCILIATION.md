# Standalone generator reconciliation — Development only

## Source history

The independent [draft PR #4](https://github.com/GoreeCloud/vault/pull/4) introduced `tools/password_generator.py`, `tests/test_password_generator.py`, `docs/password-generator.md`, and `docs/generator-interface-contract.md`. The original reviewed input head is `3bdb023b1e6bafc832be6ab9d8b7049976ee6f51`, with Python source blob `e754ed6f7e1f8f65a04e71270019c2d183a99302` and test blob `be85cb266a14eba8c486dd82709e657dc1df7e14`. This consolidated candidate **adapts** those files rather than claiming their blobs remain unchanged.

The imported Python generator and existing `src/password-generator.mjs` are two separate Development prototypes; **neither is connected to real vault storage, browser filling, authentication, clipboard, Glaze, or customer devices**. The standalone Python utility may generate synthetic output for authorized local tests; do not use any real user password in automated test output.

## Policy discrepancy and resolution

The original Python prototype accepted 12–256-character passwords with any enabled class, without a minimum guessing-resistance check. The JavaScript prototype uses a conservative output-distribution bound and refuses configurations below 128 bits. The consolidated Python candidate now enforces the same **minimum 128-bit conservative bound**, rejects non-builtin integer lengths, accepts lengths 16–256 subject to the bound, and limits custom exclusion input to 256 characters.

This is **not** behavioral or bitstream identity. JavaScript defaults to 28 characters; Python defaults to 24. Python supports explicit excluded characters and a separate 6–32-digit PIN utility; JavaScript does not. The independent implementations choose symbols from the same default alphabet and use OS-backed CSPRNG bounded selection and a post-selection shuffle. The bound is a code-review candidate, **not independently verified strength assurance**. Password-class guarantees alter the distribution, and future platform consumers need an accepted policy and audited implementation.

Numeric PIN generation has **no 128-bit assurance**; even 32 decimal digits remain below that threshold (~106 bits). PINs require independently accepted rate limiting and threat modeling, and may never be substituted for a vault master password.

## Verification and acceptance

The PR #4 independent workflow is left on its original draft branch. The consolidated candidate runs `python -m unittest discover -s tests -p 'test_*.py' -v` and all Node tests on the same SHA. Record exact CI count and changed source, especially security policy tests and custom-character input bounds. Positive CI only verifies fixture behavior; it does **not** approve the generator for operational secrets.

Human security review [issue #1](https://github.com/GoreeCloud/vault/issues/1), authorization, secure output lifecycle and memory/clipboard protections, UI accessibility, Glaze consumer review, license/provenance review and target-device testing remain outstanding. Do not merge or deploy a password-manager feature from this fixture.
