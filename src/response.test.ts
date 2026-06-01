import test from "node:test";
import assert from "node:assert/strict";
import { formatDelegationResponse, parseDelegationResponse } from "./response.js";

test("parses structured delegation response", () => {
  const parsed = parseDelegationResponse(`verdict: revise

summary:
- tighten schema validation
- keep project isolation

risks:
- UI may change

sources:
- https://example.com

next_action: add a smoke test`);

  assert.equal(parsed.verdict, "revise");
  assert.deepEqual(parsed.summary, ["tighten schema validation", "keep project isolation"]);
  assert.deepEqual(parsed.risks, ["UI may change"]);
  assert.deepEqual(parsed.sources, ["https://example.com"]);
  assert.equal(parsed.nextAction, "add a smoke test");
});

test("rejects response without verdict", () => {
  assert.throws(
    () => parseDelegationResponse("summary:\n- no verdict"),
    /missing verdict/
  );
});

test("formats normalized response", () => {
  const parsed = parseDelegationResponse("verdict: proceed\n\nsummary:\n- ok\n");
  assert.equal(formatDelegationResponse(parsed), "verdict: proceed\n\nsummary:\n- ok\n");
});
