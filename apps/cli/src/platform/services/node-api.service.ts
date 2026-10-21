// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import * as FormData from "form-data";
import * as fe from "node-fetch";
import { firstValueFrom } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { TokenService } from "@bitwarden/common/auth/abstractions/token.service";
import { VaultTimeoutSettingsService } from "@bitwarden/common/key-management/vault-timeout";
import { AppIdService } from "@bitwarden/common/platform/abstractions/app-id.service";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { ApiService } from "@bitwarden/common/services/api.service";

import { validateCliApiDestination } from "./cli-api-destination-policy";

(global as any).fetch = fe.default;
(global as any).Request = fe.Request;
(global as any).Response = fe.Response;
(global as any).Headers = fe.Headers;
(global as any).FormData = FormData;

export class NodeApiService extends ApiService {
  constructor(
    tokenService: TokenService,
    platformUtilsService: PlatformUtilsService,
    environmentService: EnvironmentService,
    appIdService: AppIdService,
    refreshAccessTokenErrorCallback: () => Promise<void>,
    logService: LogService,
    logoutCallback: () => Promise<void>,
    vaultTimeoutSettingsService: VaultTimeoutSettingsService,
    accountService: AccountService,
    customUserAgent: string = null,
  ) {
    super(
      tokenService,
      platformUtilsService,
      environmentService,
      appIdService,
      refreshAccessTokenErrorCallback,
      logService,
      logoutCallback,
      vaultTimeoutSettingsService,
      accountService,
      { createRequest: (url, request) => new Request(url, request) },
      customUserAgent,
    );
    this.cliEnvironmentService = environmentService;
  }

  private cliEnvironmentService: EnvironmentService;

  async nativeFetch(request: Request): Promise<Response> {
    const environment = await firstValueFrom(this.cliEnvironmentService.environment$);
    const problem = validateCliApiDestination(request.url, environment);
    if (problem) {
      throw new Error(problem);
    }

    // Disable automatic redirects so an allowed host cannot forward an API request
    // to an unconfigured recipient, particularly with authentication attached.
    const guardedRequest = new fe.Request(request as any, { redirect: "manual" });
    const proxy = process.env.http_proxy || process.env.https_proxy;
    if (proxy) {
      const { HttpsProxyAgent } = await import("https-proxy-agent");
      (guardedRequest as any).agent = new HttpsProxyAgent(proxy);
    }
    const response = await fe.default(guardedRequest);
    if (response.status >= 300 && response.status < 400) {
      throw new Error("CLI API redirects are disabled pending verified destination handling.");
    }
    return response as unknown as Response;
  }

  /** XMLHttpRequest is not supported in Node.js, fallback to fetch */
  override nativeXMLHttpRequest(
    request: Request,
    _onProgress: (percentage: number) => void,
  ): Promise<Response> {
    return this.nativeFetch(request);
  }
}
