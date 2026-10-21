import { createServer, Server } from "http";
import { AddressInfo } from "net";
import { of } from "rxjs";

import { Environment, Urls } from "@bitwarden/common/platform/abstractions/environment.service";

import { NodeApiService } from "./node-api.service";

describe("GoreeCloud Vault CLI Node API outbound transport boundary", () => {
  let server: Server;
  let base: string;
  let redirectTargetRequests: number;

  beforeAll(async () => {
    redirectTargetRequests = 0;
    server = createServer((req, response) => {
      if (req.url === "/redirect") {
        response.statusCode = 302;
        response.setHeader("Location", "/target");
        response.end();
      } else if (req.url === "/target") {
        redirectTargetRequests++;
        response.end("unexpected-redirect-follow");
      } else {
        response.end("synthetic-local-response");
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function mockService(
    options: { cloud?: boolean; api?: string; base?: string } = {},
  ): NodeApiService {
    const root = options.base ?? base;
    const urls: Urls = { base: root };
    const env = {
      isCloud: () => !!options.cloud,
      getUrls: () => urls,
      getApiUrl: () => options.api ?? root + "/api",
      getIdentityUrl: () => root + "/identity",
      getWebVaultUrl: () => root,
      getEventsUrl: () => root + "/events",
      getNotificationsUrl: () => root + "/notifications",
      getIconsUrl: () => root + "/icons",
    } as Environment;
    const service = Object.create(NodeApiService.prototype) as NodeApiService;
    (service as any).cliEnvironmentService = { environment$: of(env) };
    return service;
  }

  it("allows the exact configured loopback origin with synthetic data", async () => {
    const response = await mockService().nativeFetch(new Request(base + "/api/test"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("synthetic-local-response");
  });

  it("rejects a default upstream cloud environment before sending any request", async () => {
    await expect(
      mockService({ cloud: true }).nativeFetch(new Request(base + "/api/test")),
    ).rejects.toThrow(/Default upstream cloud/);
  });

  it("does not follow redirects even when redirected to an allowed host", async () => {
    const before = redirectTargetRequests;
    await expect(mockService().nativeFetch(new Request(base + "/redirect"))).rejects.toThrow(
      /redirects are disabled/,
    );
    expect(redirectTargetRequests).toBe(before);
  });

  it("blocks cross-origin destinations without issuing an HTTP request", async () => {
    await expect(
      mockService().nativeFetch(new Request("http://127.0.0.1:65533/api")),
    ).rejects.toThrow(/not one/);
  });

  it("blocks an inherited vendor URL even when a custom server is configured", async () => {
    await expect(
      mockService().nativeFetch(new Request("https://api.bitwarden.com/sync")),
    ).rejects.toThrow(/upstream/);
  });
});
