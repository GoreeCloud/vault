/**
 * Conservative prototype for saved-entry matching.
 * NOT a browser extension and NOT authorization to expose credentials.
 * Real autofill must additionally enforce frame binding, phishing-risk policy,
 * user interaction, isolation, unlock lifetime, and site-specific tests.
 */
export function canonicalSecureOrigin(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 ||
      /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
    if (url.hostname.endsWith(".")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Exact-origin only; unrelated origins, wildcards and HTTP fail closed. */
export function isExactOriginMatch(savedUrl, currentUrl) {
  const saved = canonicalSecureOrigin(savedUrl);
  const current = canonicalSecureOrigin(currentUrl);
  return saved !== null && current !== null && saved === current;
}
