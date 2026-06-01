#!/usr/bin/env node
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ManualBridgeAdapter } from "./adapters/manual.js";
import { PlaywrightBridgeAdapter } from "./adapters/playwright.js";
import { readConfig } from "./config.js";
import { jobsDir } from "./fs.js";
import { createJob } from "./job.js";
import type { AdapterName, BridgeAdapter } from "./types.js";

const adapterSchema = z.enum(["manual", "playwright"]).default("manual");
const modeSchema = z.enum(["ask", "research", "review", "debug", "plan", "summarize"]).default("ask");

const server = new McpServer({
  name: "codex-chatgpt-bridge",
  version: "0.1.0"
});

server.registerTool(
  "chatgpt_delegate",
  {
    title: "Delegate to ChatGPT",
    description:
      "Delegate a compact task to ChatGPT Web. Use manual adapter for prompt packets or playwright adapter for direct browser delegation.",
    inputSchema: {
      adapter: adapterSchema,
      mode: modeSchema,
      question: z.string().min(1),
      context: z.string().optional(),
      projectUrl: z.string().url().optional(),
      projectName: z.string().optional(),
      channel: z.string().optional(),
      timeoutMs: z.number().positive().optional()
    }
  },
  async (input) => {
    const job = createJob({
      mode: input.mode,
      question: input.question,
      context: input.context
    });
    const adapter = await createAdapter(input.adapter, input);
    const result = await adapter.submit(job);

    const body =
      result.status === "done"
        ? `job: ${result.jobId}\nresponse_path: ${result.responsePath}\n\n${result.response ?? ""}`
        : [
            `job: ${result.jobId}`,
            `prompt_path: ${path.join(jobsDir, `${job.id}.prompt.md`)}`,
            "",
            job.prompt
          ].join("\n");

    return {
      content: [{ type: "text", text: body }]
    };
  }
);

server.registerTool(
  "chatgpt_project_instructions",
  {
    title: "ChatGPT Project Instructions",
    description: "Return the recommended ChatGPT Project instructions for Codex delegation.",
    inputSchema: {}
  },
  async () => {
    const { projectInstructions } = await import("./config.js");
    return {
      content: [{ type: "text", text: projectInstructions }]
    };
  }
);

async function createAdapter(
  adapter: AdapterName,
  options: {
    channel?: string;
    timeoutMs?: number;
    projectUrl?: string;
    projectName?: string;
  }
): Promise<BridgeAdapter> {
  if (adapter === "manual") return new ManualBridgeAdapter();
  const config = await readConfig();
  return new PlaywrightBridgeAdapter({
    channel: options.channel,
    timeoutMs: options.timeoutMs,
    projectUrl: options.projectUrl ?? config.projectUrl,
    projectName: options.projectName ?? config.projectName
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
