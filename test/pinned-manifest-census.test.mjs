import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const lock = JSON.parse(readFileSync(new URL("../source-lock.json", import.meta.url), "utf8"));
const expected = Object.freeze({
  server: {dotnet:143, npm:4, rust:2},
  clients: {npm:63, rust:16}
});
const classes = [
  ["npm", /^(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|yarn\.lock|bun\.lockb?|\.yarnrc\.yml)$/i],
  ["dotnet", /^(?:global\.json|Directory\.(?:Packages|Build)\.(?:props|targets)|NuGet\.Config|packages\.lock\.json|[^/]+\.(?:csproj|fsproj|vbproj))$/i],
  ["rust", /^(?:Cargo\.toml|Cargo\.lock)$/],
  ["go", /^(?:go\.mod|go\.sum|go\.work|go\.work\.sum)$/],
  ["python", /^(?:pyproject\.toml|poetry\.lock|uv\.lock|Pipfile(?:\.lock)?|requirements(?:-[a-z0-9_.-]+)?\.txt|setup\.(?:py|cfg))$/i],
  ["jvm", /^(?:pom\.xml|build\.gradle(?:\.kts)?|gradle\.lockfile|settings\.gradle(?:\.kts)?|libs\.versions\.toml)$/],
  ["ruby", /^(?:Gemfile(?:\.lock)?|gems\.rb(?:\.lock)?)$/],
  ["php", /^(?:composer\.(?:json|lock))$/],
  ["dart", /^(?:pubspec\.(?:yaml|lock))$/],
  ["swift", /^(?:Package\.swift|Package\.resolved)$/],
  ["other", /^(?:mix\.(?:exs|lock)|Podfile(?:\.lock)?)$/]
];

test("pinned upstream trees retain source-manifest declaration census", () => {
  assert.equal(lock.classification, "source-reference-only");
  assert.equal(lock.upstream.length, 2);
  for (const source of lock.upstream) {
    assert.ok(Object.hasOwn(expected, source.name));
    assert.equal(source.path, "upstream/bitwarden/" + source.name);
    assert.equal(source.runAsGoreeCloud, false);
    const raw = execFileSync("git", ["ls-tree", "-r", "-z", "HEAD", "--", source.path],
      {cwd:root,encoding:"utf8",maxBuffer:64*1024*1024});
    assert.ok(raw.endsWith("\0"), "Git tree output must be NUL-terminated");
    const counts = {}, manifests=[];
    for (const record of raw.slice(0,-1).split("\0")) {
      const match = /^(100644|100755|120000|160000) (blob|commit) ([a-f0-9]{40})\t(.+)$/.exec(record);
      assert.ok(match, "Unexpected Git tree record");
      const [, mode, , blob, path] = match;
      assert.ok(path.startsWith(source.path + "/"), "Unexpected path");
      assert.ok(!path.split("/").includes("bitwarden_license"), "Commercial-only path");
      if (mode !== "100644" && mode !== "100755") continue;
      const filename=path.split("/").at(-1);
      const kind=classes.find(([,pattern])=>pattern.test(filename))?.[0];
      if(!kind)continue;
      counts[kind]=(counts[kind]??0)+1;
      manifests.push(kind+"\t"+path+"\t"+blob);
    }
    assert.deepEqual(counts, expected[source.name]);
    manifests.sort();
    const digest=createHash("sha256").update(manifests.join("\n")).digest("hex");
    assert.match(digest, /^[a-f0-9]{64}$/);
    assert.equal(manifests.length,
      Object.values(expected[source.name]).reduce((a,b)=>a+b,0));
  }
});
