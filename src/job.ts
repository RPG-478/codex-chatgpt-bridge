import { randomUUID } from "node:crypto";
import { outputShapeFor, parseMode } from "./modes.js";
import { buildPrompt } from "./prompt.js";
import type { Job, Mode } from "./types.js";

export type CreateJobInput = {
  mode?: string | Mode;
  question: string;
  context?: string;
};

export function createJob(input: CreateJobInput): Job {
  const mode = parseMode(input.mode);
  const base = {
    id: randomUUID(),
    mode,
    question: input.question,
    context: input.context ?? "",
    createdAt: new Date().toISOString(),
    outputShape: outputShapeFor(mode)
  };

  return {
    ...base,
    prompt: buildPrompt(base)
  };
}
