import { Environment } from "@bitwarden/common/platform/abstractions/environment.service";

import { validateVaultServerUrls } from "../commands/server-config-validation";

/**
 * Narrow development-only egress policy for NodeApiService, not the SDK or other clients.
 * No production tenant or remote service is authorized by this helper.
 */
export function validateCliApiDestination(
  destination: string,
  environment: Environment,
): string | null {
  if (environment.isCloud()) {
    return "Default upstream cloud API destinations are disabled in GoreeCloud Vault Development.";
  }
  const configurationError = validateVaultServerUrls(environment.getUrls());
  if (configurationError) {
    return configurationError;
  }

  let requested: URL;
  try {
    requested = new URL(destination);
  } catch {
    return "Invalid destination for GoreeCloud Vault CLI API request.";
  }
  if (requested.username || requested.password) {
    return "Embedded credentials in CLI API destinations are prohibited.";
  }
  // The configured URLs are validated using the same URL rules before their origins
  // are admitted. Reject inherited endpoints exposed through resolution fallback.
  const serviceUrls = [
    environment.getApiUrl(),
    environment.getIdentityUrl(),
    environment.getWebVaultUrl(),
    environment.getEventsUrl(),
    environment.getNotificationsUrl(),
    environment.getIconsUrl(),
  ].filter((value): value is string => !!value);

  if (!serviceUrls.length) {
    return "No resolved GoreeCloud Vault development API origins are configured.";
  }
  const allowedOrigins = new Set<string>();
  for (const serviceUrl of serviceUrls) {
    const invalid = validateVaultServerUrls({ base: serviceUrl });
    if (invalid) {
      return invalid;
    }
    allowedOrigins.add(new URL(serviceUrl).origin);
  }

  const invalidRequest = validateVaultServerUrls({ base: requested.origin });
  if (invalidRequest) {
    return invalidRequest;
  }
  if (!allowedOrigins.has(requested.origin)) {
    return "CLI API destination is not one of the explicitly configured development service origins.";
  }
  return null;
}
