import test from "node:test";
import assert from "node:assert/strict";
import { checkNavigation } from "./navigation.js";

test("reject verification pages before attempting to submit", () => {
  assert.throws(() => checkNavigation(403, "Just a moment...", true), /BROWSER_VERIFICATION_REQUIRED.*headless/);
  assert.throws(() => checkNavigation(200, "Just a moment...", false), /BROWSER_VERIFICATION_REQUIRED/);
  assert.throws(() => checkNavigation(429, "", true), /RATE_LIMITED/);
  assert.throws(() => checkNavigation(503, "", true), /BROWSER_HTTP_ERROR/);
  assert.doesNotThrow(() => checkNavigation(200, "ChatGPT", true));
});
