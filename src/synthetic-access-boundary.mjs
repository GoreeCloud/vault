import { snapshotSyntheticExactRecord } from "./synthetic-exact-record.mjs";

/**
 * Development-only access-boundary screening for synthetic single-owner vaults.
 *
 * This function is not an authorization engine. All "trusted" facts are a
 * caller-provided sketch of data that a future authenticated service MUST
 * independently obtain from authoritative session, policy and storage owners.
 * It must never guard real credential reads, writes, deletion or disclosure.
 */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REQUEST_KEYS = Object.freeze(["vaultId", "itemId", "operation"]);
const CONTEXT_KEYS = Object.freeze([
  "principalId", "tenantId", "vaultTenantId", "vaultId", "vaultOwnerId",
  "resourceItemId", "resourceVaultId", "resourceTenantId",
  "sessionActive", "sessionNotRevoked", "membershipActive",
  "policyCurrent", "grantVerified", "grantedRole",
  "policyVersion", "sessionPolicyVersion"
]);
const OPERATIONS = new Set(["read", "create", "replace", "delete"]);
const ROLES = new Set(["owner", "editor", "viewer", "none"]);
const deny = reason => Object.freeze({ candidate: false, reason });

const validId = x => typeof x === "string" && ID.test(x);
const validVersion = x => Number.isSafeInteger(x) && x >= 1;

/**
 * Screen candidate operation shape; candidate=true is never a grant.
 * Responses are frozen, omit all identifiers, and carry no secret material.
 */
export function screenSyntheticVaultAccess(request, context) {
  try {
    const req = snapshotSyntheticExactRecord(request, REQUEST_KEYS);
    const ctx = snapshotSyntheticExactRecord(context, CONTEXT_KEYS);
    if (!req || !ctx) return deny("invalid-shape");

    if (!validId(req.vaultId) || !validId(req.itemId) ||
        !validId(ctx.principalId) || !validId(ctx.tenantId) ||
        !validId(ctx.vaultTenantId) ||
        !validId(ctx.vaultId) || !validId(ctx.vaultOwnerId) ||
        !OPERATIONS.has(req.operation) || !ROLES.has(ctx.grantedRole)) {
      return deny("invalid-identity-or-operation");
    }

    if (ctx.sessionActive !== true || ctx.sessionNotRevoked !== true ||
        ctx.membershipActive !== true || ctx.policyCurrent !== true ||
        !validVersion(ctx.policyVersion) ||
        !validVersion(ctx.sessionPolicyVersion) ||
        ctx.policyVersion !== ctx.sessionPolicyVersion) {
      return deny("stale-or-inactive-context");
    }

    if (req.vaultId !== ctx.vaultId) return deny("vault-mismatch");
    if (ctx.tenantId !== ctx.vaultTenantId) return deny("tenant-mismatch");

    if (req.operation === "create") {
      if (ctx.resourceItemId !== null ||
          ctx.resourceVaultId !== null ||
          ctx.resourceTenantId !== null) return deny("unexpected-existing-resource");
    } else if (ctx.resourceItemId !== req.itemId ||
               ctx.resourceVaultId !== ctx.vaultId ||
               ctx.resourceTenantId !== ctx.tenantId) {
      return deny("resource-scope-mismatch");
    }

    if (ctx.grantedRole === "none") return deny("no-candidate-grant");
    if (ctx.grantVerified !== true) return deny("unverified-grant");

    if (ctx.grantedRole === "owner") {
      if (ctx.principalId !== ctx.vaultOwnerId) {
        return deny("owner-identity-mismatch");
      }
    } else if (ctx.principalId === ctx.vaultOwnerId) {
      return deny("unverified-delegated-grant");
    }

    if (ctx.grantedRole === "viewer" && req.operation !== "read") {
      return deny("role-operation-mismatch");
    }
    if (ctx.grantedRole === "editor" && req.operation === "delete") {
      return deny("role-operation-mismatch");
    }

    return Object.freeze({ candidate: true, reason: "synthetic-screen-only" });
  } catch {
    return deny("invalid-shape");
  }
}
