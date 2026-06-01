#!/usr/bin/env node
import path from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { browserProfileDir, configPath, ensureStateDirs, jobsDir, readTextFile, responsesDir, writeText } from "./fs.js";
import { ManualBridgeAdapter } from "./adapters/manual.js";
import {
  PlaywrightBridgeAdapter,
  checkChatGptReady,
  debugChatGptPage,
  debugSubmitPrompt,
  loginWithPlaywright
} from "./adapters/playwright.js";
import { readConfig, updateConfig, validateChatGptProjectUrl, writeProjectInstructions } from "./config.js";
import { createJob } from "./job.js";
import { formatDelegationResponse, parseDelegationResponse } from "./response.js";
import type { AdapterName, BridgeAdapter, Job } from "./types.js";

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string; args: Args } {
  const [command = "help", ...rest] = argv;
  const args: Args = {};

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }

  return { command, args };
}

function textArg(args: Args, name: string): string | undefined {
  const value = args[name];
  return typeof value === "string" ? value : undefined;
}

function boolArg(args: Args, name: string): boolean {
  return args[name] === true || args[name] === "true";
}

function numberArg(args: Args, name: string, fallback: number): number {
  const value = textArg(args, name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --${name}: ${value}`);
  return parsed;
}

function adapterName(args: Args): AdapterName {
  const value = textArg(args, "adapter") ?? process.env.CGPT_ADAPTER ?? "manual";
  if (value === "manual" || value === "playwright") return value;
  throw new Error(`Unknown adapter "${value}". Use manual or playwright.`);
}

async function resolveProjectUrl(args: Args): Promise<string | undefined> {
  const explicit = textArg(args, "project-url") ?? process.env.CGPT_PROJECT_URL;
  if (explicit) return validateChatGptProjectUrl(explicit);
  return (await readConfig()).projectUrl;
}

async function resolveProjectName(args: Args): Promise<string | undefined> {
  return textArg(args, "project-name") ?? process.env.CGPT_PROJECT_NAME ?? (await readConfig()).projectName;
}

async function createAdapter(args: Args): Promise<BridgeAdapter> {
  const adapter = adapterName(args);
  if (adapter === "manual") return new ManualBridgeAdapter();
  return new PlaywrightBridgeAdapter({
    channel: textArg(args, "channel"),
    headless: boolArg(args, "headless"),
    timeoutMs: numberArg(args, "timeout-ms", 180_000),
    projectUrl: await resolveProjectUrl(args),
    projectName: await resolveProjectName(args),
    unsafeDebug: boolArg(args, "unsafe-debug")
  });
}

async function readContext(args: Args): Promise<string> {
  const inline = textArg(args, "context");
  const file = textArg(args, "context-file");
  if (inline && file) throw new Error("Use either --context or --context-file, not both.");
  if (inline) return inline;
  if (file) return readTextFile(file);
  return "";
}

async function commandAsk(args: Args): Promise<void> {
  const question = textArg(args, "question");
  if (!question) throw new Error("Missing --question.");
  const job = createJob({
    mode: textArg(args, "mode"),
    question,
    context: await readContext(args)
  });

  const adapter = await createAdapter(args);
  const result = await adapter.submit(job);

  console.log(`job: ${result.jobId}`);
  console.log(`prompt: ${path.join(jobsDir, `${job.id}.prompt.md`)}`);
  if (result.status === "done") {
    console.log(`response: ${result.responsePath}`);
    return;
  }
  console.log("");
  console.log(job.prompt);
  console.log("");
  console.log("Paste the prompt into ChatGPT, save the answer to a file, then run:");
  console.log(`node .\\dist\\cli.js save --job ${job.id} --from-file .\\answer.md`);
}

async function commandSave(args: Args): Promise<void> {
  const jobId = textArg(args, "job");
  const fromFile = textArg(args, "from-file");
  const text = textArg(args, "text");
  if (!jobId) throw new Error("Missing --job.");
  if (!fromFile && !text) throw new Error("Use --from-file or --text.");
  if (fromFile && text) throw new Error("Use either --from-file or --text, not both.");

  await ensureStateDirs();
  const response = fromFile ? await readTextFile(fromFile) : text ?? "";
  const parsed = parseDelegationResponse(response);
  const responsePath = path.join(responsesDir, `${jobId}.md`);
  await writeText(responsePath, formatDelegationResponse(parsed));
  console.log(`saved: ${responsePath}`);
}

async function commandShow(args: Args): Promise<void> {
  const jobId = textArg(args, "job");
  if (!jobId) throw new Error("Missing --job.");

  const responsePath = path.join(responsesDir, `${jobId}.md`);
  const jobPath = path.join(jobsDir, `${jobId}.json`);
  if (!existsSync(jobPath)) throw new Error(`Unknown job: ${jobId}`);
  if (!existsSync(responsePath)) {
    console.log(`pending: ${jobId}`);
    console.log(`expected response: ${responsePath}`);
    return;
  }
  console.log(await readTextFile(responsePath));
}

async function commandDoctor(args: Args): Promise<void> {
  let failed = false;
  const report = (ok: boolean, label: string, detail?: string) => {
    failed = failed || !ok;
    console.log(`${ok ? "[ok]" : "[fail]"} ${label}${detail ? `: ${detail}` : ""}`);
  };
  const warn = (label: string, detail?: string) => {
    console.log(`[warn] ${label}${detail ? `: ${detail}` : ""}`);
  };

  const config = await readConfig();
  report(existsSync(browserProfileDir), "Browser profile path exists", browserProfileDir);
  if (existsSync(configPath)) {
    report(true, "Config file exists", configPath);
  } else {
    warn("Config file not found", "run project-set to target a dedicated ChatGPT Project");
  }

  if (config.projectUrl) {
    try {
      validateChatGptProjectUrl(config.projectUrl);
      report(true, "Project URL configured", config.projectUrl);
    } catch (error: unknown) {
      report(false, "Project URL configured", error instanceof Error ? error.message : String(error));
    }
  } else if (config.projectName) {
    report(true, "Project name configured", config.projectName);
    warn("Project name targeting is less stable than URL targeting");
  } else {
    warn("Project target not configured", "ask still works, but messages may go to a normal chat");
  }

  try {
    parseDelegationResponse("verdict: proceed\n\nsummary:\n- schema validation works\n");
    report(true, "Schema validation works");
  } catch (error: unknown) {
    report(false, "Schema validation works", error instanceof Error ? error.message : String(error));
  }

  report(!boolArg(args, "unsafe-debug"), "Debug mode disabled", boolArg(args, "unsafe-debug") ? "do not use doctor with --unsafe-debug" : undefined);

  if (adapterName(args) === "playwright") {
    try {
      const result = await checkChatGptReady({
        channel: textArg(args, "channel"),
        headless: boolArg(args, "headless"),
        timeoutMs: numberArg(args, "timeout-ms", 120_000),
        projectUrl: await resolveProjectUrl(args),
        projectName: await resolveProjectName(args)
      });
      report(true, "ChatGPT session logged in", result.title || "(title unavailable)");
      report(true, "Project page reachable", result.url);
    } catch (error: unknown) {
      report(false, "ChatGPT browser check", error instanceof Error ? error.message : String(error));
    }
  } else {
    warn("ChatGPT browser check skipped", "run doctor --adapter playwright to verify login and Project reachability");
  }

  if (existsSync(jobsDir)) {
    const jobCount = (await readdir(jobsDir).catch(() => [])).length;
    warn("Local job files", `${jobCount} file(s) under ${jobsDir}, ignored by git`);
  }

  if (failed) process.exitCode = 1;
}

function printHelp(): void {
  console.log(`cgpt commands:
  login [--channel chrome|msedge] [--project-url <url>] [--timeout-ms <number>]
  project-set (--url <chatgpt-project-url>|--name <project-name>)
  project-instructions [--out <path>]
  doctor [--adapter manual|playwright] [--channel chrome|msedge] [--timeout-ms <number>]
  profile-path
  debug-page --unsafe-debug [--channel chrome|msedge] [--project-url <url>] [--timeout-ms <number>]
  debug-submit --unsafe-debug --text <text> [--channel chrome|msedge]
  ask  --mode <ask|research|review|debug|plan|summarize> --question <text> [--context <text>|--context-file <path>] [--adapter manual|playwright] [--project-url <url>|--project-name <name>]
  save --job <id> (--from-file <path>|--text <text>)
  show --job <id>`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv.slice(2));
  if (command === "login") {
    return loginWithPlaywright({
      channel: textArg(args, "channel"),
      headless: boolArg(args, "headless"),
      timeoutMs: numberArg(args, "timeout-ms", 10 * 60 * 1000),
      projectUrl: await resolveProjectUrl(args),
      projectName: await resolveProjectName(args)
    });
  }
  if (command === "project-set") {
    const url = textArg(args, "url");
    const name = textArg(args, "name");
    if (!url && !name) throw new Error("Missing --url or --name.");
    if (url && name) throw new Error("Use either --url or --name, not both.");
    if (url) {
      const projectUrl = validateChatGptProjectUrl(url);
      await updateConfig({ projectUrl, projectName: undefined });
      console.log(`projectUrl: ${projectUrl}`);
    } else if (name) {
      await updateConfig({ projectName: name, projectUrl: undefined });
      console.log(`projectName: ${name}`);
    }
    return;
  }
  if (command === "project-instructions") {
    const out = textArg(args, "out") ?? ".cgpt/project-instructions.md";
    await ensureStateDirs();
    await writeProjectInstructions(out);
    console.log(`wrote: ${out}`);
    return;
  }
  if (command === "doctor") return commandDoctor(args);
  if (command === "profile-path") {
    console.log(browserProfileDir);
    return;
  }
  if (command === "debug-page") {
    return debugChatGptPage({
      channel: textArg(args, "channel"),
      headless: boolArg(args, "headless"),
      timeoutMs: numberArg(args, "timeout-ms", 120_000),
      projectUrl: await resolveProjectUrl(args),
      projectName: await resolveProjectName(args),
      unsafeDebug: boolArg(args, "unsafe-debug")
    });
  }
  if (command === "debug-submit") {
    return debugSubmitPrompt(textArg(args, "text") ?? "hello", {
      channel: textArg(args, "channel"),
      headless: boolArg(args, "headless"),
      timeoutMs: numberArg(args, "timeout-ms", 120_000),
      unsafeDebug: boolArg(args, "unsafe-debug")
    });
  }
  if (command === "ask") return commandAsk(args);
  if (command === "save") return commandSave(args);
  if (command === "show") return commandShow(args);
  printHelp();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
