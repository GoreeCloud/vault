import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"
);

test("all GitHub Actions dependencies are pinned to full immutable commits", () => {
  const actions = [...workflow.matchAll(/^\s*uses:\s*(\S+)/gm)].map(match => match[1]);
  assert.equal(actions.length, 4, "both CI jobs must contain checkout and setup-node");
  for (const action of actions) {
    assert.match(action, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}$/,
      "workflow action is not pinned to an immutable commit: " + action);
  }
  assert.equal(actions.filter(x => x.startsWith("actions/checkout@")).length, 2);
  assert.equal(actions.filter(x => x.startsWith("actions/setup-node@")).length, 2);
  assert.deepEqual(
    [...new Set(actions)].sort(),
    [
      "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
      "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020"
    ].sort(),
    "review action upgrades explicitly and update the pinned revision test"
  );
});

test("CI privileges remain read-only and both test jobs exist", () => {
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /^\s*unit-tests:\s*$/m);
  assert.match(workflow, /^\s*browser-smoke:\s*$/m);
  assert.match(workflow, /^\s*run: npm run test:browser\s*$/m);
  assert.doesNotMatch(workflow, /pull_request_target:|write-all|persist-credentials:\s*true/);
});
