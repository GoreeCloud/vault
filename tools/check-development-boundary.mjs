/**
 * Development-only tripwire against accidental release surface expansion.
 *
 * Static checks, not a security audit, sandbox, runtime monitor, secret
 * detector, license approval or proof that imported upstream code is safe.
 * Human cryptography, provenance and release gates remain mandatory.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const isRecord = x => x !== null && typeof x === "object" && !Array.isArray(x);
const expectedScripts = Object.freeze({
  test: "node --test test/*.test.mjs && node tools/check-foundation.mjs && node tools/check-development-boundary.mjs",
  check: "node tools/check-foundation.mjs",
  preview: "node tools/serve-preview.mjs"
});
const forbiddenManifestKeys = [
  "main", "bin", "exports", "module", "browser", "files",
  "publishConfig", "dependencies", "devDependencies",
  "peerDependencies", "optionalDependencies"
];
const expectedSourcePaths = Object.freeze({
  server: "upstream/bitwarden/server",
  clients: "upstream/bitwarden/clients"
});

export function inspectDevelopmentBoundary({ manifest, html, css, workflow, lock, trackedPaths } = {}) {
  const violations = [];
  const flag = (bad, code) => { if (bad) violations.push(code); };

  flag(!isRecord(manifest) || manifest.name !== "goreecloud-vault-foundation" ||
    manifest.private !== true || manifest.version !== "0.1.0-dev" ||
    manifest.type !== "module", "nonprivate-or-release-package");
  if (!isRecord(manifest?.scripts)) {
    violations.push("script-contract-absent");
  } else {
    const keys = Object.keys(manifest.scripts);
    flag(keys.length !== Object.keys(expectedScripts).length ||
      keys.some(key => !Object.hasOwn(expectedScripts, key) ||
        manifest.scripts[key] !== expectedScripts[key]), "unexpected-executable-script");
  }
  flag(!isRecord(manifest) ||
    forbiddenManifestKeys.some(key => Object.hasOwn(manifest, key)), "package-distribution-or-dependency-surface");

  flag(typeof html !== "string" ||
    /<\s*(?:form|input|textarea|select|button|script|iframe|object|embed)\b/i.test(html) ||
    /\bon(?:load|click|submit|change|error)\s*=/i.test(html),
    "preview-interactive-or-executable");
  flag(typeof html !== "string" || /https?:\/\/|fetch\s*\(|\b(?:localStorage|sessionStorage|indexedDB|WebSocket)\b/i.test(html) ||
    !html.includes("NOT A WORKING PASSWORD MANAGER") ||
    !html.includes("Do not provide secrets") ||
    !html.includes("script-src 'none'") ||
    !html.includes("connect-src 'none'") ||
    !html.includes("form-action 'none'"), "preview-network-or-missing-warning");
  flag(typeof css !== "string" || /@import\b|\burl\s*\(/i.test(css), "preview-styles-import");

  flag(typeof workflow !== "string" ||
    !workflow.includes("permissions:\n  contents: read") ||
    !workflow.includes("persist-credentials: false") ||
    !workflow.includes("run: npm test") ||
    !workflow.includes("python -m unittest discover -s tests -p 'test_lock_lifecycle*.py' -v") ||
    /(?:id-token|packages|actions):\s*write\b/i.test(workflow) ||
    /(?:npm publish|docker push|kubectl apply|deploy to production)\b/i.test(workflow),
    "ci-least-privilege-or-coverage-gap");

  if (!isRecord(lock) || lock.classification !== "source-reference-only" ||
      lock.schemaVersion !== 1 || !Array.isArray(lock.upstream) ||
      lock.upstream.length !== 2 ||
      lock.upstream.some(item => !isRecord(item) ||
        !Object.hasOwn(expectedSourcePaths, item.name) ||
        item.path !== expectedSourcePaths[item.name] ||
        item.runAsGoreeCloud !== false ||
        !Array.isArray(item.excludedDirectories) ||
        !["bitwarden_license", ".git"].every(v => item.excludedDirectories.includes(v))) ||
      new Set(lock.upstream.map(item => item?.name)).size !== 2) {
    violations.push("untrusted-source-import-classification");
  }
  if (!Array.isArray(trackedPaths) || trackedPaths.some(x => typeof x !== "string")) {
    violations.push("tracked-paths-unavailable");
  } else {
    // Upstream path trees retain upstream notices and are separately pinned
    // by check-foundation.mjs. This checks first-party additions, not upstream.
    const own = trackedPaths.filter(p => !p.startsWith("upstream/bitwarden/"));
    flag(own.some(p => /(^|\/)(?:\.env(?:\.[^/]+)?|id_rsa|vault\.db|bitwarden_license)(?:\/|$)/i.test(p)),
      "first-party-sensitive-or-commercial-path");
    flag(own.some(p => /^(?:dist|build|release|deployment|deploy|backend|server|clients|apps|extension|mobile)\//i.test(p) ||
      /^(?:Dockerfile|docker-compose\.[^/]+|Procfile)$/i.test(p)),
      "unapproved-operational-or-distribution-path");
  }
  return Object.freeze({ ok: violations.length === 0, violations: Object.freeze(violations) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const at = rel => readFileSync(new URL("../" + rel, import.meta.url), "utf8");
  const result = inspectDevelopmentBoundary({
    manifest: JSON.parse(at("package.json")),
    html: at("preview/index.html"),
    css: at("preview/styles.css"),
    workflow: at(".github/workflows/foundation.yml"),
    lock: JSON.parse(at("source-lock.json")),
    trackedPaths: execFileSync("git", ["ls-files", "-z"], {encoding:"utf8", maxBuffer: 64 * 1024 * 1024}).split("\0").filter(Boolean)
  });
  if (!result.ok) {
    process.stderr.write("Development release boundary violations: " + result.violations.join(", ") + "\n");
    process.exitCode = 1;
  } else process.stdout.write("PASS: Development release-boundary tripwire (not security approval)\n");
}
