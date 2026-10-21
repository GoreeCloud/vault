import { Urls } from "@bitwarden/common/platform/abstractions/environment.service";

/**
 * Development-only CLI server configuration validation.
 * This does not establish endpoint trust, control network traffic, or validate credentials.
 */
const inheritedDomains = ["bitwarden.com", "bitwarden.eu", "bitwarden-gov.com", "bitwarden.net"];

export function validateVaultServerUrls(urls: Urls): string | null {
  if (!urls.base || !urls.base.trim()) {
    return "GoreeCloud Vault requires an explicit development server base URL.";
  }

  for (const candidate of Object.values(urls)) {
    if (candidate == null || candidate === "") {
      continue;
    }
    const lower = candidate.trim().toLowerCase();
    if (lower === "null" || (lower.includes("://") && !lower.startsWith("https://") && !lower.startsWith("http://"))) {
      return "Invalid Vault service URL.";
    }
    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(candidate) ? candidate : "https://" + candidate);
    } catch {
      return "Invalid Vault service URL.";
    }

    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (
      inheritedDomains.some((domain) => host === domain || host.endsWith("." + domain))
    ) {
      return "Inherited upstream service endpoints are disabled in GoreeCloud Vault Development.";
    }

    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(host);
    if (parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
      return "Remote Vault services require HTTPS.";
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return "Vault service URLs cannot contain credentials, query strings or fragments.";
    }
  }

  return null;
}
