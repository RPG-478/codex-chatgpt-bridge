import test from "node:test";
import assert from "node:assert/strict";
import { verifyProjectUrl } from "./project.js";
import { validateChatGptProjectUrl } from "./config.js";

const expected = "https://chatgpt.com/g/g-p-abc123/project";

test("accepts the configured Project and its chat URLs", () => {
  assert.equal(validateChatGptProjectUrl(expected), expected);
  verifyProjectUrl(expected, expected);
  verifyProjectUrl(expected, "https://chatgpt.com/g/g-p-abc123/c/chat-id");
});

test("rejects normal chats, different Projects, and deceptive URLs", () => {
  for (const actual of ["https://chatgpt.com/c/chat-id", "https://chatgpt.com/g/g-p-other/c/chat-id", "https://example.com/g/g-p-abc123/c/chat-id"]) {
    assert.throws(() => verifyProjectUrl(expected, actual), /PROJECT_MISMATCH/);
  }
  assert.throws(() => validateChatGptProjectUrl("https://chatgpt.com/c/project-not-real"), /Project URL/);
});
