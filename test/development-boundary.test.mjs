import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { inspectDevelopmentBoundary as inspect } from "../tools/check-development-boundary.mjs";

const read = relative => readFileSync(new URL("../" + relative, import.meta.url), "utf8");
const initial = {
  manifest: JSON.parse(read("package.json")),
  html: read("preview/index.html"),
  css: read("preview/styles.css"),
  workflow: read(".github/workflows/foundation.yml"),
  lock: JSON.parse(read("source-lock.json")),
  trackedPaths: execFileSync("git", ["ls-files", "-z"], {encoding:"utf8"}).split("\0").filter(Boolean)
};
const fixture = () => structuredClone(initial);
const contains = (result, code) => {
  assert.equal(result.ok, false);
  assert.ok(result.violations.includes(code), "Expected violation: " + code);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.violations));
};

test("current exact source respects explicitly non-operational boundary", () => {
  assert.deepEqual(inspect(fixture()), {ok:true,violations:[]});
});

test("refuses any nonprivate or release-like package metadata", () => {
  for (const patch of [
    {private:false}, {version:"1.0.0"}, {name:"goreecloud-vault"}, {type:"commonjs"}
  ]) {
    const f=fixture();Object.assign(f.manifest,patch);
    contains(inspect(f),"nonprivate-or-release-package");
  }
});

test("rejects publish scripts, launch entrypoints and any dependency addition", () => {
  const a=fixture();a.manifest.scripts.start="node server.mjs";
  contains(inspect(a),"unexpected-executable-script");
  const b=fixture();b.manifest.bin={"vault":"vault.mjs"};
  contains(inspect(b),"package-distribution-or-dependency-surface");
  const c=fixture();c.manifest.dependencies={"unapproved-lib":"1.0.0"};
  contains(inspect(c),"package-distribution-or-dependency-surface");
});

test("detects silent weakening of exact allowlisted development scripts", () => {
  const a=fixture();a.manifest.scripts.preview="node tools/serve-preview.mjs --listen-all";
  contains(inspect(a),"unexpected-executable-script");
  const b=fixture();b.manifest.scripts.test="node --test test/*.test.mjs";
  contains(inspect(b),"unexpected-executable-script");
});

test("rejects credential forms or executable scripts in static preview", () => {
  for (const injected of ["<input type=password>", "<script>alert(1)</script>",
    "<form action=/login></form>", "<button>Unlock</button>"]) {
    const f=fixture();f.html+=injected;
    contains(inspect(f),"preview-interactive-or-executable");
  }
});

test("rejects missing warnings or preview network and style loading", () => {
  const a=fixture();a.html=a.html.replace("Do not provide secrets","Enter your password");
  contains(inspect(a),"preview-network-or-missing-warning");
  const b=fixture();b.html+="<img src=https://elsewhere.invalid/a.png>";
  contains(inspect(b),"preview-network-or-missing-warning");
  const c=fixture();c.css+='@import "https://elsewhere.invalid/style.css";';
  contains(inspect(c),"preview-styles-import");
});

test("rejects loosened CI privilege and absent Python coverage", () => {
  const a=fixture();a.workflow=a.workflow.replace("contents: read","contents: write");
  contains(inspect(a),"ci-least-privilege-or-coverage-gap");
  const b=fixture();b.workflow=b.workflow.replace("python -m unittest discover","python -m noop discover");
  contains(inspect(b),"ci-least-privilege-or-coverage-gap");
  const c=fixture();c.workflow+="\n  id-token: write\n";
  contains(inspect(c),"ci-least-privilege-or-coverage-gap");
});

test("rejects promoted or expanded unreviewed Bitwarden import paths", () => {
  const a=fixture();a.lock.upstream[0].runAsGoreeCloud=true;
  contains(inspect(a),"untrusted-source-import-classification");
  const b=fixture();b.lock.upstream[0].excludedDirectories=[];
  contains(inspect(b),"untrusted-source-import-classification");
  const c=fixture();c.lock.upstream[1].path="upstream/bitwarden/mobile";
  contains(inspect(c),"untrusted-source-import-classification");
});

test("rejects accidental first-party launch and sensitive file paths", () => {
  const a=fixture();a.trackedPaths.push("backend/server.mjs");
  contains(inspect(a),"unapproved-operational-or-distribution-path");
  const b=fixture();b.trackedPaths.push("src/.env.production");
  contains(inspect(b),"first-party-sensitive-or-commercial-path");
  const c=fixture();c.trackedPaths.push("Dockerfile");
  contains(inspect(c),"unapproved-operational-or-distribution-path");
});

test("fails closed for absent or untrusted evidence and never leaks caller bytes", () => {
  const result=inspect({});
  assert.equal(result.ok,false);
  const x=fixture();x.manifest.description="synthetic-example-credential";
  x.trackedPaths.push("secrets/.env");
  const r=inspect(x);
  contains(r,"first-party-sensitive-or-commercial-path");
  assert.ok(!JSON.stringify(r).includes("synthetic-example-credential"));
});
