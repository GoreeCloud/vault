import { validateVaultServerUrls } from "./server-config-validation";

describe("GoreeCloud Vault development CLI server configuration", () => {
  it("rejects missing or null base rather than falling back to upstream cloud", () => {
    expect(validateVaultServerUrls({ base: null })).toMatch(/explicit development server/);
    expect(validateVaultServerUrls({ api: "https://api.example.test", identity: "https://identity.example.test" }))
      .toMatch(/explicit development server/);
  });

  it.each([
    "https://bitwarden.com",
    "https://api.bitwarden.com",
    "https://identity.bitwarden.eu",
    "https://vault.bitwarden-gov.com",
    "https://icons.bitwarden.net",
    "https://api.bitwarden.com.",
  ])("rejects inherited upstream service host %s", (url) => {
    expect(validateVaultServerUrls({ base: url })).toMatch(/Inherited upstream/);
  });

  it("checks optional overrides too", () => {
    expect(validateVaultServerUrls({
      base: "https://vault.example.test",
      api: "https://api.bitwarden.eu",
    })).toMatch(/Inherited upstream/);
  });

  it("rejects non-HTTPS remote transport and embedded credentials", () => {
    expect(validateVaultServerUrls({ base: "http://vault.example.test" })).toMatch(/HTTPS/);
    expect(validateVaultServerUrls({ base: "https://user:pass@vault.example.test" })).toMatch(/credentials/);
    expect(validateVaultServerUrls({ base: "https://vault.example.test/?token=fixture" })).toMatch(/query/);
    expect(validateVaultServerUrls({ base: "https://vault.example.test/#fragment" })).toMatch(/fragments/);
  });

  it("allows explicit synthetic HTTPS and local-loopback development endpoints", () => {
    expect(validateVaultServerUrls({ base: "https://vault.example.test" })).toBeNull();
    expect(validateVaultServerUrls({ base: "http://localhost:8080" })).toBeNull();
    expect(validateVaultServerUrls({ base: "http://127.0.0.1:8080" })).toBeNull();
  });

  it("rejects invalid address syntax", () => {
    expect(validateVaultServerUrls({ base: "https://[bad-ipv6" })).toMatch(/Invalid/);
    expect(validateVaultServerUrls({ base: "null" })).toMatch(/Invalid/);
    expect(validateVaultServerUrls({ base: "ftp://vault.example.test" })).toMatch(/Invalid/);
  });
});
