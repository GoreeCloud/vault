import { Environment, Urls } from "@bitwarden/common/platform/abstractions/environment.service";

import { validateCliApiDestination } from "./cli-api-destination-policy";

function testEnvironment(
  urls: Urls = { base: "http://localhost:8089" },
  cloud = false,
  overrides: Partial<Record<"api" | "identity" | "web" | "icons", string>> = {},
): Environment {
  return {
    isCloud: () => cloud,
    getUrls: () => urls,
    getApiUrl: () => overrides.api ?? "http://localhost:8089/api",
    getIdentityUrl: () => overrides.identity ?? "http://localhost:8089/identity",
    getWebVaultUrl: () => overrides.web ?? "http://localhost:8089",
    getEventsUrl: () => "http://localhost:8089/events",
    getNotificationsUrl: () => "http://localhost:8089/notifications",
    getIconsUrl: () => overrides.icons ?? "http://localhost:8089/icons",
  } as Environment;
}

describe("GoreeCloud Vault CLI API origin boundary", () => {
  it("rejects inherited default cloud regions", () => {
    expect(
      validateCliApiDestination("https://api.bitwarden.com/sync", testEnvironment(undefined, true)),
    ).toMatch(/Default upstream cloud/);
  });

  it("rejects a missing explicitly configured server", () => {
    expect(
      validateCliApiDestination("http://localhost:8089/api/sync", testEnvironment({})),
    ).toMatch(/explicit development server/);
  });

  it("accepts only origins actually resolved from an explicit development environment", () => {
    const env = testEnvironment();
    expect(validateCliApiDestination("http://localhost:8089/api/sync", env)).toBeNull();
    expect(
      validateCliApiDestination("http://localhost:8089/identity/connect/token", env),
    ).toBeNull();
    expect(validateCliApiDestination("http://127.0.0.1:8089/api/sync", env)).toMatch(/not one/);
    expect(validateCliApiDestination("http://localhost:8090/api/sync", env)).toMatch(/not one/);
    expect(validateCliApiDestination("https://other.example.test/api", env)).toMatch(/not one/);
  });

  it("rejects upstream vendor hosts in the request and resolved service endpoints", () => {
    const env = testEnvironment();
    expect(validateCliApiDestination("https://api.bitwarden.com/sync", env)).toMatch(/upstream/);
    expect(
      validateCliApiDestination(
        "http://localhost:8089/api/sync",
        testEnvironment(undefined, false, {
          icons: "https://icons.bitwarden.eu",
        }),
      ),
    ).toMatch(/upstream/);
  });

  it("rejects unencrypted remote services and URL credentials", () => {
    expect(validateCliApiDestination("http://example.test/api", testEnvironment())).toMatch(
      /HTTPS/,
    );
    expect(
      validateCliApiDestination("http://me:secret@localhost:8089/api", testEnvironment()),
    ).toMatch(/Embedded credentials/);
  });

  it("supports a synthetic HTTPS development service on an exact origin", () => {
    const host = "https://staging.example.test";
    const env = testEnvironment({ base: host }, false, {
      api: host + "/api",
      identity: host + "/identity",
      web: host,
      icons: host + "/icons",
    });
    // The stub's other endpoint methods use localhost; both are explicitly returned
    // by the synthetic environment. No live hostname is contacted by this test.
    expect(validateCliApiDestination(host + "/api/sync", env)).toBeNull();
    expect(validateCliApiDestination("https://staging-other.example.test/api", env)).toMatch(
      /not one/,
    );
  });
});
