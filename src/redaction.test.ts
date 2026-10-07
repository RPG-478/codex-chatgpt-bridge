import test from "node:test";
import assert from "node:assert/strict";
import { createJob } from "./job.js";

test("blocks credentials in both question and context before creating a job", () => {
  for (const input of [
    { question: "Use sk-" + "a".repeat(30), context: "" },
    { question: "Review", context: "Authorization: Bearer " + "x".repeat(40) },
    { question: "Review", context: "-----BEGIN PRIVATE KEY-----\nexample" },
    { question: "Review", context: "password=" + "p".repeat(20) }
  ]) {
    assert.throws(() => createJob(input), /SECRET_DETECTED/);
  }
});

test("ordinary context still creates a job", () => {
  assert.match(createJob({ question: "Review this", context: "The function returns 42." }).prompt, /The function returns 42/);
});
