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
  "principalId", "tenantId", "vaultId", "vaultOwnerId",
  "resourceItemId", "resourceVaultId", "resourceTenantId",
  "sessionActive", "sessionNotRevoked", "membershipActive",
  "policyCurrent", "grantVerified", "grantedRole",
  "policyVersion", "sessionPolicyVersion"
]);
const OPERATIONS = new Set(["read", "create", "replace", "delete"]);
const ROLES = new Set(["owner", "editor", "viewer", "none"]);
const deny = reason => Object.freeze({ candidate: false, reason });

function exactDataRecord(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length) return false;
  return keys.every(key => {
    if (typeof key !== "string" || !expected.includes(key)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
  });
}

const validId = x => typeof x === "string" && ID.test(x);
const validVersion = x => Number.isSafeInteger(x) && x >= 1;

/**
 * Screen candidate operation shape; candidate=true is never a grant.
 * Responses are frozen, omit all identifiers, and carry no secret material.
 */
export function screenSyntheticVaultAccess(request, context) {
  try {
    if (!exactDataRecord(request, REQUEST_KEYS) ||
        !exactDataRecord(context, CONTEXT_KEYS)) return deny("invalid-shape");

    if (!validId(request.vaultId) || !validId(request.itemId) ||
        !validId(context.principalId) || !validId(context.tenantId) ||
        !validId(context.vaultId) || !validId(context.vaultOwnerId) ||
        !OPERATIONS.has(request.operation) || !ROLES.has(context.grantedRole)) {
      return deny("invalid-identity-or-operation");
    }

    if (context.sessionActive !== true || context.sessionNotRevoked !== true ||
        context.membershipActive !== true || context.policyCurrent !== true ||
        !validVersion(context.policyVersion) ||
        !validVersion(context.sessionPolicyVersion) ||
        context.policyVersion !== context.sessionPolicyVersion) {
      return deny("stale-or-inactive-context");
    }

    if (request.vaultId !== context.vaultId) return deny("vault-mismatch");

    if (request.operation === "create") {
      if (context.resourceItemId !== null ||
          context.resourceVaultId !== null ||
          context.resourceTenantId !== null) return deny("unexpected-existing-resource");
    } else if (context.resourceItemId !== request.itemId ||
               context.resourceVaultId !== context.vaultId ||
               context.resourceTenantId !== context.tenantId) {
      return deny("resource-scope-mismatch");
    }

    if (context.grantedRole === "none") return deny("no-candidate-grant");

    if (context.grantedRole === "owner") {
      if (context.principalId !== context.vaultOwnerId) {
        return deny("owner-identity-mismatch");
      }
    } else if (context.principalId === context.vaultOwnerId ||
               context.grantVerified !== true) {
      return deny("unverified-delegated-grant");
    }

    if (context.grantedRole === "viewer" && request.operation !== "read") {
      return deny("role-operation-mismatch");
    }
    if (context.grantedRole === "editor" && request.operation === "delete") {
      return deny("role-operation-mismatch");
    }
    if (typeof context.grantVerified !== "boolean") return deny("invalid-grant-evidence");

    return Object.freeze({ candidate: true, reason: "synthetic-screen-only" });
  } catch {
    return deny("invalid-shape");
  }
}
