import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const lock = JSON.parse(fs.readFileSync(path.join(root, "source-lock.json"), "utf8"));
assert.equal(lock.schemaVersion, 1);
assert.equal(lock.classification, "source-reference-only");
assert.ok(Array.isArray(lock.upstream) && lock.upstream.length === 2);
for (const item of lock.upstream) {
  assert.match(item.commit, /^[a-f0-9]{40}$/);
  assert.match(item.gitTreeSha, /^[a-f0-9]{40}$/);
  const committedTree = execFileSync("git", ["rev-parse", "HEAD:" + item.path], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(committedTree, item.gitTreeSha, item.name + ": imported source tree changed without provenance acceptance");
  assert.equal(item.runAsGoreeCloud, false);
  assert.match(item.path, /^upstream\/bitwarden\/(server|clients)$/);
  const p = path.join(root, item.path);
  assert.ok(fs.statSync(p).isDirectory(), item.path + " missing");
  for (const name of ["LICENSE.txt", "LICENSE_GPL.txt"].filter(n => item.name === "clients")) {
    assert.ok(fs.existsSync(path.join(p, name)), item.name + ": license file missing: " + name);
  }
  if (item.name === "server") assert.ok(fs.existsSync(path.join(p, "LICENSE_AGPL.txt")), "server AGPL notice missing");
  assert.ok(fs.existsSync(path.join(p, "LICENSE.txt")), "upstream LICENSE.txt missing");
  const stack = [p];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      assert.notEqual(entry.name, "bitwarden_license", "Commercial-only module present");
      assert.notEqual(entry.name, ".git", "Nested git metadata present");
      if (entry.isDirectory()) stack.push(path.join(dir, entry.name));
    }
  }
}
for (const file of ["docs/ARCHITECTURE.md", "docs/SECURITY-GATES.md", "docs/THREAT-MODEL.md", "docs/SECURE-GENERATION.md", "docs/AUTOFILL-SAFETY.md", "docs/NATIVE-SYNC-CONTRACT.md", "docs/SYNTHETIC-REVISION-MODEL.md", "docs/SYNTHETIC-OFFLINE-QUEUE.md", "docs/SYNTHETIC-ACCESS-BOUNDARY.md", "docs/SYNTHETIC-CLIENT-ITEM-SCHEMA.md", "docs/CRYPTOGRAPHY-CANDIDATE.md", "docs/PLATFORM-CONFORMANCE.md", "docs/GLAZE-EXPERIENCE.md", "docs/SOURCE-AND-LICENSING.md", "docs/ROADMAP.md"]) {
  assert.ok(fs.existsSync(path.join(root, file)), "required governance document missing: " + file);
}
console.log("PASS: imported source notice, commercial-module exclusion, and governance baseline checks");
