import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";

import { Response } from "../models/response";

/**
 * GoreeCloud Fork — development update boundary.
 *
 * Upstream Bitwarden release checks and suggested npm installs would direct
 * this independently maintained fork to another product's binaries. Do not
 * fetch a release feed or advertise an update until the GoreeCloud Vault
 * channel, signatures, legal review, rollback and migrations are approved.
 */
export class UpdateCommand {
  // Preserve the existing CLI construction contract without enabling updates.
  constructor(
    _platformUtilsService: PlatformUtilsService,
    _apiService: ApiService,
  ) {}

  async run(): Promise<Response> {
    return Response.error(
      "GoreeCloud Vault CLI update checks are disabled during Development. " +
        "No verified GoreeCloud release feed or signed upgrade is available.",
    );
  }
}
