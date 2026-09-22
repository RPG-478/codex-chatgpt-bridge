import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("CLI rejects explicit false browser options for manual and default adapters", async () => {
  const cli = fileURLToPath(new URL("./cli.js", import.meta.url));
  for (const adapter of [[], ["--adapter", "manual"]]) {
    for (const option of ["headless", "minimized"]) {
      await assert.rejects(
        promisify(execFile)(process.execPath, [cli, "ask", ...adapter, `--${option}`, "false", "--question", "test"], { env: { ...process.env, CGPT_ADAPTER: "manual" } }),
        (error: unknown) => String((error as { stderr?: string }).stderr).includes("Browser options require --adapter playwright.")
      );
    }
  }
});

test("CLI rejects invalid boolean browser option values", async () => {
  const cli = fileURLToPath(new URL("./cli.js", import.meta.url));
  for (const option of ["headless", "minimized"]) {
    await assert.rejects(
      promisify(execFile)(process.execPath, [cli, "ask", "--adapter", "playwright", `--${option}`, "invalid", "--question", "test"]),
      (error: unknown) => String((error as { stderr?: string }).stderr).includes(`--${option} expects true or false.`)
    );
  }
});

test("CLI requires an explicit model when Power is requested", async () => {
  const cli = fileURLToPath(new URL("./cli.js", import.meta.url));
  await assert.rejects(
    promisify(execFile)(process.execPath, [cli, "ask", "--adapter", "playwright", "--power", "3", "--question", "test"]),
    (error: unknown) => String((error as { stderr?: string }).stderr).includes("--power requires an explicit --model")
  );
});

test("MCP rejects explicit false browser options for manual and default adapters", async () => {
  const client = new Client({ name: "manual-options-test", version: "1.0.0" });
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("./mcp.js", import.meta.url))] });
  try {
    await client.connect(transport);
    for (const adapter of [undefined, "manual"]) {
      for (const option of ["headless", "minimized"]) {
        const result = await client.callTool({ name: "chatgpt_delegate", arguments: { ...(adapter ? { adapter } : {}), question: "test", [option]: false } });
        assert.equal(result.isError, true);
        assert.match(JSON.stringify(result.content), /Browser options require the playwright adapter/);
      }
    }
  } finally { await client.close(); }
});
