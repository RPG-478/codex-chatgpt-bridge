import type { Job } from "./types.js";

export function buildPrompt(job: Omit<Job, "prompt">): string {
  const sourcesLine = job.outputShape.requireSources
    ? "- sources: 3-6 URLs when web research was used"
    : "- sources: omit unless essential";
  const nextActionLine = job.outputShape.requireNextAction
    ? "- next_action: one concrete sentence"
    : "- next_action: omit";

  return [
    "Delegation notice:",
    "- This message is sent by Codex, an AI coding agent acting on the user's local machine.",
    "- Do not assume the sender is the human user.",
    "- Codex is delegating a compact subtask and will independently verify your answer before acting.",
    "",
    "You are assisting Codex as a compact delegation backend.",
    "Answer for an expert coding agent. Be direct. Do not include long explanations.",
    "",
    `Mode: ${job.mode}`,
    "",
    "Question:",
    job.question,
    "",
    "Context:",
    job.context.trim() || "(none)",
    "",
    "Return exactly this Markdown structure:",
    "",
    "```markdown",
    "verdict: proceed | revise | blocked",
    "summary:",
    `- max ${job.outputShape.maxBullets} bullets total`,
    "risks:",
    "- only include material risks",
    sourcesLine,
    nextActionLine,
    "```"
  ].join("\n");
}
