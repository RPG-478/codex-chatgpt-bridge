import path from "node:path";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright-core";
import { browserProfileDir, ensureStateDirs, jobsDir, responsesDir, writeJson, writeText } from "../fs.js";
import { formatDelegationResponse, parseDelegationResponse } from "../response.js";
import type { BridgeAdapter, BridgeResult, Job } from "../types.js";
import { verifyModel } from "./model.js";
import { checkNavigation } from "./navigation.js";
import { verifyPower } from "./power.js";

type PlaywrightOptions = {
  channel?: string;
  headless?: boolean;
  minimized?: boolean;
  model?: string;
  power?: number;
  timeoutMs?: number;
  projectUrl?: string;
  projectName?: string;
  unsafeDebug?: boolean;
};

const chatGptUrl = "https://chatgpt.com/";

export class PlaywrightBridgeAdapter implements BridgeAdapter {
  constructor(private readonly options: PlaywrightOptions = {}) {}

  async submit(job: Job): Promise<BridgeResult> {
    if (this.options.power !== undefined && (!this.options.model || !Number.isInteger(this.options.power) || this.options.power < 1 || this.options.power > 5)) {
      throw new Error("Power requires an explicit model and an integer from 1 to 5.");
    }
    await ensureStateDirs();
    await persistJob(job);

    const context = await launchChatGptContext(this.options);
    try {
      const page = await openChatGpt(context, this.options);
      let selection = this.options.model ? await verifyModel(page, this.options.model, true) : undefined;
      const power = this.options.power !== undefined ? await verifyPower(page, this.options.power, true) : undefined;
      if (power && this.options.model) selection = await verifyModel(page, this.options.model);
      await submitPrompt(page, job.prompt, this.options.timeoutMs);
      const response = await waitForLatestAssistantText(page, this.options.timeoutMs);
      if (this.options.model) {
        try {
          const confirmed = await verifyModel(page, this.options.model);
          if (confirmed.displayLabel !== selection?.displayLabel) throw new Error("MODEL_UNVERIFIABLE: model display label changed during the request.");
          if (power) await verifyPower(page, power.level);
        }
        catch (error) { throw new Error(`Request was already sent; do not retry automatically. ${error instanceof Error ? error.message : String(error)}`); }
      }
      const parsed = parseDelegationResponse(response);
      const normalizedResponse = formatDelegationResponse(parsed);
      const responsePath = path.join(responsesDir, `${job.id}.md`);
      await writeText(responsePath, normalizedResponse);

      return {
        jobId: job.id,
        status: "done",
        response: normalizedResponse,
        verifiedModel: this.options.model,
        modelDisplay: selection?.displayLabel,
        power: power?.level,
        powerLabel: power?.label,
        responsePath
      };
    } finally {
      await context.close();
    }
  }
}

export async function loginWithPlaywright(options: PlaywrightOptions = {}): Promise<void> {
  if (options.headless) throw new Error("Login requires a visible browser. Remove --headless.");
  await ensureStateDirs();
  const context = await launchChatGptContext({ ...options, headless: false, minimized: false });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(options.projectUrl ?? chatGptUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs ?? 120_000
    });

    console.log("ChatGPT opened. Log in in the browser window if needed.");
    console.log("This command exits after the message box is detected and login buttons disappear.");

    await waitForLoggedInReady(page, 10 * 60 * 1000);
    console.log("Login looks ready: authenticated prompt editor detected.");
  } finally {
    await context.close();
  }
}

export async function debugChatGptPage(options: PlaywrightOptions = {}): Promise<void> {
  assertUnsafeDebug(options);
  await ensureStateDirs();
  const context = await launchChatGptContext(options);
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(options.projectUrl ?? chatGptUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs ?? 120_000
    });
    await page.waitForTimeout(5_000);

    const title = await page.title().catch(() => "(title unavailable)");
    const url = page.url();
    const editorCount = await promptEditor(page).count().catch(() => -1);
    const assistantCount = await assistantMessages(page).count().catch(() => -1);
    const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");

    console.log(`title: ${title}`);
    console.log(`url: ${url}`);
    console.log(`prompt editors: ${editorCount}`);
    console.log(`assistant messages: ${assistantCount}`);
    console.log("body preview:");
    console.log(maskDebugText(bodyText).slice(0, 2000));
  } finally {
    await context.close();
  }
}

export async function debugSubmitPrompt(prompt: string, options: PlaywrightOptions = {}): Promise<void> {
  assertUnsafeDebug(options);
  await ensureStateDirs();
  const context = await launchChatGptContext(options);
  try {
    const page = await openChatGpt(context, options);
    const editor = await waitForPromptEditor(page, options.timeoutMs ?? 120_000);
    await editor.click();
    await editor.fill(prompt);
    await page.waitForTimeout(1_000);

    const sendCandidates = await page
      .locator('button, [role="button"]')
      .evaluateAll((nodes) =>
        nodes.slice(0, 80).map((node) => {
          const element = node as HTMLElement;
          return {
            text: element.innerText,
            aria: element.getAttribute("aria-label"),
            testid: element.getAttribute("data-testid"),
            disabled: element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true"
          };
        })
      );

    console.log(`editor text: ${await editor.innerText().catch(() => "(innerText unavailable)")}`);
    console.log("button candidates:");
    console.log(maskDebugText(JSON.stringify(sendCandidates, null, 2)));
  } finally {
    await context.close();
  }
}

export async function checkChatGptReady(options: PlaywrightOptions = {}): Promise<{ url: string; title: string }> {
  await ensureStateDirs();
  const context = await launchChatGptContext(options);
  try {
    const page = await openChatGpt(context, options);
    return {
      url: page.url(),
      title: await page.title().catch(() => "")
    };
  } finally {
    await context.close();
  }
}

async function persistJob(job: Job): Promise<void> {
  await writeJson(path.join(jobsDir, `${job.id}.json`), job);
  await writeText(path.join(jobsDir, `${job.id}.prompt.md`), job.prompt);
}

async function launchChatGptContext(options: PlaywrightOptions): Promise<BrowserContext> {
  const timeout = options.timeoutMs ?? 120_000;
  if (options.minimized && options.headless) throw new Error("minimized requires a headed browser; omit headless or set it to false.");
  const headless = options.headless ?? false;
  const minimized = options.minimized ?? !headless;
  const context = await chromium.launchPersistentContext(browserProfileDir, {
    channel: options.channel ?? process.env.CGPT_BROWSER_CHANNEL ?? "chrome",
    headless,
    timeout,
    viewport: { width: 1280, height: 900 },
    args: minimized ? ["--start-minimized"] : []
  });
  if (minimized) {
    try {
      const page = context.pages()[0] ?? await context.newPage();
      const session = await context.newCDPSession(page);
      const { windowId } = await session.send("Browser.getWindowForTarget");
      await session.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "minimized" } });
      const { bounds } = await session.send("Browser.getWindowBounds", { windowId });
      if (bounds.windowState !== "minimized") throw new Error("Chrome did not confirm the minimized window state.");
      await session.detach();
    } catch (error) { await context.close(); throw error; }
  }
  return context;
}

async function openChatGpt(context: BrowserContext, options: PlaywrightOptions = {}): Promise<Page> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const page = context.pages()[0] ?? (await context.newPage());
  const navigation = await page.goto(options.projectUrl ?? chatGptUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  checkNavigation(navigation?.status(), await page.title(), options.headless ?? false);
  try { await waitForPromptEditor(page, timeoutMs); }
  catch {
    // Verification and login screens can appear after the initial navigation
    // response, so classify the final page state before returning a generic error.
    checkNavigation(navigation?.status(), await page.title().catch(() => ""), options.headless ?? false);
    if (await hasLoginCallToAction(page)) {
      throw new Error("ChatGPT is not logged in. Run: node .\\dist\\cli.js login --channel chrome");
    }
    throw new Error(`BROWSER_NOT_READY: ChatGPT editor unavailable${options.headless ? " in headless mode" : ""}. Check login, verification or limits in visible Chrome. No prompt was sent.`);
  }
  if (await hasLoginCallToAction(page)) {
    throw new Error("ChatGPT is not logged in. Run: node .\\dist\\cli.js login --channel chrome");
  }
  if (!options.projectUrl && options.projectName) {
    await openProjectByName(page, options.projectName, timeoutMs);
  }
  await verifyProjectTarget(page, options, timeoutMs);
  return page;
}

async function openProjectByName(page: Page, projectName: string, timeoutMs: number): Promise<void> {
  const projectTarget = page
    .locator("a, button")
    .filter({ hasText: new RegExp(`^\\s*${escapeRegex(projectName)}\\s*$`) })
    .first();

  await projectTarget.click({ timeout: timeoutMs });
  await waitForPromptEditor(page, timeoutMs);
}

async function verifyProjectTarget(page: Page, options: PlaywrightOptions, timeoutMs: number): Promise<void> {
  if (options.projectUrl) {
    const expected = new URL(options.projectUrl);
    const actual = new URL(page.url());
    if (!actual.pathname.includes("project")) {
      throw new Error(`Expected ChatGPT Project page, got: ${page.url()}`);
    }
    if (actual.pathname !== expected.pathname) {
      throw new Error(`Project URL mismatch. Expected ${expected.pathname}, got ${actual.pathname}.`);
    }
  }

  if (options.projectName) {
    const heading = page
      .locator("main")
      .getByText(new RegExp(`^\\s*${escapeRegex(options.projectName)}\\s*$`))
      .first();
    await heading.waitFor({ state: "visible", timeout: Math.min(timeoutMs, 15_000) });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function waitForPromptEditor(page: Page, timeoutMs: number): Promise<Locator> {
  const editor = promptEditor(page);
  await editor.waitFor({ state: "visible", timeout: timeoutMs });
  return editor;
}

async function waitForLoggedInReady(page: Page, timeoutMs: number): Promise<void> {
  await waitForPromptEditor(page, timeoutMs);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await hasLoginCallToAction(page))) return;
    await page.waitForTimeout(1_000);
  }

  throw new Error("Timed out waiting for authenticated ChatGPT session.");
}

async function hasLoginCallToAction(page: Page): Promise<boolean> {
  const loginPattern = /log in|login|\u30ed\u30b0\u30a4\u30f3/i;
  const signupPattern = /sign up|signup|\u7121\u6599\u3067\u30b5\u30a4\u30f3\u30a2\u30c3\u30d7/i;
  const loginLinks = page.getByRole("link", { name: loginPattern });
  const loginButtons = page.getByRole("button", { name: loginPattern });
  const signupLinks = page.getByRole("link", { name: signupPattern });

  const counts = await Promise.all([
    loginLinks.count().catch(() => 0),
    loginButtons.count().catch(() => 0),
    signupLinks.count().catch(() => 0)
  ]);

  return counts.some((count) => count > 0);
}

function promptEditor(page: Page): Locator {
  return page
    .locator(
      [
        '[data-testid="prompt-textarea"]',
        '#prompt-textarea',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"]'
      ].join(", ")
    )
    .first();
}

async function submitPrompt(page: Page, prompt: string, timeoutMs = 120_000): Promise<void> {
  const editor = await waitForPromptEditor(page, timeoutMs);
  const beforeCount = await assistantMessages(page).count();

  await editor.click({ timeout: timeoutMs });
  await editor.fill(prompt, { timeout: timeoutMs });

  const sendButton = findSendButton(page);

  if (await sendButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sendButton.click({ timeout: timeoutMs });
  } else {
    await editor.press("Enter");
  }

  await page
    .waitForFunction(
      (count) => document.querySelectorAll('[data-message-author-role="assistant"]').length > count,
      beforeCount,
      { timeout: 10_000 }
    )
    .catch(() => undefined);
}

function assistantMessages(page: Page): Locator {
  return page.locator('[data-message-author-role="assistant"]');
}

function findSendButton(page: Page): Locator {
  const sendLabel = "\u9001\u4fe1";
  const promptSendLabel = "\u30d7\u30ed\u30f3\u30d7\u30c8\u3092\u9001\u4fe1";
  return page
    .locator(
      [
        '[data-testid="send-button"]',
        'button[aria-label*="Send"]',
        `button[aria-label*="${sendLabel}"]`,
        `button[aria-label*="${promptSendLabel}"]`
      ].join(", ")
    )
    .first();
}

async function waitForLatestAssistantText(page: Page, timeoutMs = 120_000): Promise<string> {
  let stableText = "";
  let stableCount = 0;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const text = normalizeResponse(await extractLatestResponseText(page));
    const generating = await isGenerating(page);

    if (text && text === stableText && !generating) {
      stableCount += 1;
    } else {
      stableText = text;
      stableCount = 0;
    }

    if (stableText && stableCount >= 2) return stableText;
    await page.waitForTimeout(1_000);
  }

  throw new Error("RESPONSE_TIMEOUT: completion was not confirmed. Check the chat before retrying; the prompt may already have been sent.");
}

async function extractLatestResponseText(page: Page): Promise<string> {
  const assistantCount = await assistantMessages(page).count().catch(() => 0);
  if (assistantCount > 0) {
    const fromAssistant = await assistantMessages(page)
      .nth(assistantCount - 1)
      .innerText({ timeout: 1_000 })
      .catch(() => "");
    if (fromAssistant.trim()) return fromAssistant;
  }

  const mainText = await page.locator("main").innerText({ timeout: 1_000 }).catch(() => "");
  const verdictIndex = mainText.lastIndexOf("verdict:");
  if (verdictIndex >= 0) return mainText.slice(verdictIndex);

  const summaryIndex = mainText.lastIndexOf("summary:");
  if (summaryIndex >= 0) return mainText.slice(summaryIndex);

  return "";
}

async function isGenerating(page: Page): Promise<boolean> {
  const stopVisible = await page
    .locator('[data-testid="stop-button"], button[aria-label*="Stop"]')
    .first()
    .isVisible({ timeout: 500 })
    .catch(() => false);
  if (stopVisible) return true;

  const sendDisabled = await page
    .locator('[data-testid="send-button"], button[aria-label*="Send"]')
    .last()
    .isDisabled({ timeout: 500 })
    .catch(() => false);
  return sendDisabled;
}

function normalizeResponse(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\bCopy code\b/g, "")
    .trim();
}

function assertUnsafeDebug(options: PlaywrightOptions): void {
  if (!options.unsafeDebug) {
    throw new Error("Debug commands can expose account or chat data. Re-run with --unsafe-debug to continue.");
  }
}

function maskDebugText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/g-p-[a-f0-9]+/gi, "g-p-[project]")
    .replace(/\b\d{6,}\b/g, "[number]");
}
