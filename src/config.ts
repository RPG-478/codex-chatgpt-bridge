import { configPath, ensureStateDirs, readJsonFile, writeJson, writeText } from "./fs.js";

export type BridgeConfig = {
  projectUrl?: string;
  projectName?: string;
};

export async function readConfig(): Promise<BridgeConfig> {
  return (await readJsonFile<BridgeConfig>(configPath)) ?? {};
}

export async function updateConfig(next: BridgeConfig): Promise<void> {
  await ensureStateDirs();
  const current = await readConfig();
  await writeJson(configPath, { ...current, ...next });
}

export function validateChatGptProjectUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.hostname !== "chatgpt.com") {
    throw new Error("Project URL must be on chatgpt.com.");
  }
  if (!parsed.pathname.includes("project")) {
    throw new Error("Project URL should look like a ChatGPT project URL.");
  }
  return parsed.toString();
}

export const projectInstructions = `Codex delegation project instructions

Purpose:
- This project is used as a workspace for Codex, an AI coding agent running on the user's local machine.
- Messages may be sent by Codex through a local bridge, not by the human user directly.

Behavior:
- Treat delegated tasks as compact subtasks for Codex.
- Do not assume the sender is the human user.
- Keep responses short, structured, and suitable for Codex to verify.
- Prefer: verdict, summary, risks, sources when relevant, next_action.
- Never ask for secrets, credentials, private tokens, or unrelated personal data.
- If the task appears unsafe, ambiguous, or outside the provided context, return verdict: blocked.

Boundaries:
- Codex remains responsible for final decisions, code edits, command execution, and verification.
- Do not claim actions were taken in the user's local environment.
- Do not rely on memories or context outside this project unless explicitly provided in the prompt.
`;

export async function writeProjectInstructions(filePath: string): Promise<void> {
  await writeText(filePath, projectInstructions);
}
