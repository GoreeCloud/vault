import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = new URL("../upstream/bitwarden/", import.meta.url);

test("pinned .NET API reference lockfile retains declared components", () => {
  const lock = JSON.parse(readFileSync(new URL("server/src/Api/packages.lock.json", source), "utf8"));
  assert.equal(lock.version, 1);
  const net = lock.dependencies?.["net10.0"];
  assert.ok(net && typeof net === "object");
  const counts = {Direct:0, Transitive:0, Project:0};
  for (const info of Object.values(net)) {
    assert.ok(Object.hasOwn(counts, info.type));
    counts[info.type]++;
    if (info.type !== "Project") assert.match(info.resolved, /^[^\s]{1,128}$/);
  }
  assert.deepEqual(counts, {Direct:14, Transitive:144, Project:17});
});

test("pinned desktop Cargo reference retains registry/git/local split", () => {
  const lock = readFileSync(new URL("clients/apps/desktop/desktop_native/Cargo.lock", source), "utf8");
  const packages=lock.split(/(?=^\[\[package\]\]$)/m).filter(x=>x.startsWith("[[package]]"));
  assert.equal(packages.length,646);
  const counts={registry:0,git:0,local:0};
  let missingChecksum=0;
  for(const block of packages){
    assert.match(block,/^name = "[^"\n]+"$/m);
    assert.match(block,/^version = "[^"\n]+"$/m);
    const origin=/^source = "([^"\n]+)"$/m.exec(block)?.[1];
    if(!origin)counts.local++;
    else if(origin.startsWith("registry+"))counts.registry++;
    else if(origin.startsWith("git+"))counts.git++;
    else assert.fail("unexpected upstream Cargo source type");
    if(!/^checksum = "[^"\n]+"$/m.test(block))missingChecksum++;
  }
  assert.deepEqual(counts,{registry:622,git:10,local:14});
  assert.equal(missingChecksum,24);
});
