import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const stateDir = ".cgpt";
export const jobsDir = path.join(stateDir, "jobs");
export const responsesDir = path.join(stateDir, "responses");
export const configPath = path.join(stateDir, "config.json");
export const browserProfileDir =
  process.env.CGPT_BROWSER_PROFILE_DIR ?? path.join(os.homedir(), ".codex-chatgpt-bridge", "browser-profile");

export async function ensureStateDirs(): Promise<void> {
  await mkdir(jobsDir, { recursive: true });
  await mkdir(responsesDir, { recursive: true });
  await mkdir(browserProfileDir, { recursive: true });
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeText(filePath: string, value: string): Promise<void> {
  await writeFile(filePath, value, "utf8");
}
