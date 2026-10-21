import { BaseProgram } from "./base-program";
import { Response } from "./models/response";

class TestProgram extends BaseProgram {
  showError() {
    this.processResponse(Response.error("synthetic failure"));
  }
}

describe("GoreeCloud Vault CLI ambient process flag isolation", () => {
  const keys = [
    "BW_CLEANEXIT",
    "BW_RESPONSE",
    "BW_QUIET",
    "GOREECLOUD_VAULT_CLEANEXIT",
    "GOREECLOUD_VAULT_RESPONSE",
    "GOREECLOUD_VAULT_QUIET",
  ] as const;
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const oldExitCode = process.exitCode;

  beforeEach(() => {
    for (const key of keys) {
      delete process.env[key];
    }
    process.exitCode = 0;
  });

  afterAll(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    process.exitCode = oldExitCode;
  });

  it("does not mask failures when inherited BW_CLEANEXIT is set", () => {
    process.env.BW_CLEANEXIT = "true";
    new TestProgram({} as any).showError();
    expect(process.exitCode).toBe(1);
  });

  it("does not mask failures when fork flag is the string false", () => {
    process.env.GOREECLOUD_VAULT_CLEANEXIT = "false";
    new TestProgram({} as any).showError();
    expect(process.exitCode).toBe(1);
  });

  it("preserves the explicit --cleanexit behavior for fork-only input", () => {
    process.env.BW_CLEANEXIT = "false";
    process.env.GOREECLOUD_VAULT_CLEANEXIT = "true";
    new TestProgram({} as any).showError();
    expect(process.exitCode).toBe(0);
  });
});
