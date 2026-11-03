/**
 * Basic offline credential hygiene indicators.
 * Never logs, transmits, persists or returns password values.
 * This is intentionally NOT entropy estimation or breach monitoring.
 */
const COMMON = new Set([
  "password", "password1", "password123", "123456", "12345678",
  "123456789", "qwerty", "qwerty123", "admin", "letmein",
  "welcome", "iloveyou", "111111", "123123", "abc123"
]);

export function auditVaultLogins(items) {
  if (!Array.isArray(items)) throw new TypeError("Expected vault item array.");
  const logins = items.filter(item => item?.type === "login");
  const usage = new Map();
  for (const item of logins) {
    if (typeof item.password !== "string" || !item.password) continue;
    usage.set(item.password, (usage.get(item.password) ?? 0) + 1);
  }
  const findings = [];
  let reusedCount = 0;
  let shortCount = 0;
  let commonCount = 0;
  let httpCount = 0;
  for (const item of logins) {
    const reasons = [];
    const password = typeof item.password === "string" ? item.password : "";
    if (password && usage.get(password) > 1) {
      reusedCount += 1;
      reasons.push("Password reused across vault logins");
    }
    if (password && [...password].length < 12) {
      shortCount += 1;
      reasons.push("Password shorter than 12 characters");
    }
    if (password && COMMON.has(password.toLowerCase())) {
      commonCount += 1;
      reasons.push("Common, easily guessed password");
    }
    if (typeof item.website === "string" && /^http:\/\//i.test(item.website)) {
      httpCount += 1;
      reasons.push("Login URL uses unencrypted HTTP");
    }
    if (reasons.length) {
      // Titles are already visible inside the unlocked vault; secrets are not returned.
      findings.push({ id: String(item.id ?? ""), title: String(item.title ?? "Untitled"), reasons });
    }
  }
  return {
    loginsReviewed: logins.length,
    passwordsReviewed: [...usage.values()].reduce((sum, count) => sum + count, 0),
    reusedCount,
    shortCount,
    commonCount,
    httpCount,
    findings
  };
}
