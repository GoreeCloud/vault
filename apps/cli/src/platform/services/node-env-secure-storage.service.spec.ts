import { SymmetricCryptoKey } from "@bitwarden/legacy-crypto";

import { NodeEnvSecureStorageService } from "./node-env-secure-storage.service";

describe("GoreeCloud Vault CLI session environment boundary", () => {
  const goreecloudSession = "GOREECLOUD_VAULT_SESSION";
  const upstreamSession = "BW_SESSION";
  const originalGoreeCloud = process.env.GOREECLOUD_VAULT_SESSION;
  const originalUpstream = process.env.BW_SESSION;
  const goreecloudKey = Buffer.alloc(64, 0xa5).toString("base64");
  const upstreamKey = Buffer.alloc(64, 0x5a).toString("base64");

  const readKey = (): SymmetricCryptoKey | null => {
    const service = new NodeEnvSecureStorageService(null as any, { info: jest.fn() } as any, null as any);
    return (service as any).getSessionKey() as SymmetricCryptoKey | null;
  };

  beforeEach(() => {
    delete process.env.GOREECLOUD_VAULT_SESSION;
    delete process.env.BW_SESSION;
  });

  afterAll(() => {
    if (originalGoreeCloud === undefined) delete process.env[goreecloudSession];
    else process.env[goreecloudSession] = originalGoreeCloud;
    if (originalUpstream === undefined) delete process.env[upstreamSession];
    else process.env[upstreamSession] = originalUpstream;
  });

  it("never imports a legacy BW_SESSION into fork secure storage", () => {
    process.env.BW_SESSION = upstreamKey;
    expect(readKey()).toBeNull();
  });

  it("accepts the GoreeCloud-only session namespace", () => {
    process.env.GOREECLOUD_VAULT_SESSION = goreecloudKey;
    expect(readKey()?.toBase64()).toBe(goreecloudKey);
  });

  it("never gives an inherited upstream session precedence", () => {
    process.env.BW_SESSION = upstreamKey;
    process.env.GOREECLOUD_VAULT_SESSION = goreecloudKey;
    expect(readKey()?.toBase64()).toBe(goreecloudKey);
  });

  it("does not fall back to a legacy session if GoreeCloud session is malformed", () => {
    process.env.BW_SESSION = upstreamKey;
    process.env.GOREECLOUD_VAULT_SESSION = "not-a-valid-session";
    expect(readKey()).toBeNull();
  });
});
