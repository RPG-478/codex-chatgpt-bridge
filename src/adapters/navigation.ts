export function checkNavigation(status: number | undefined, title: string, headless: boolean): void {
  if (status === 403 || /just a moment|verify you are human|checking your browser/i.test(title)) {
    throw new Error(`BROWSER_VERIFICATION_REQUIRED: ChatGPT returned ${status ?? "a verification page"}${headless ? " in headless mode" : ""}. Use --headless false and complete any verification manually. No prompt was sent; no automatic retry or fallback was attempted.`);
  }
  if (status === 429) {
    throw new Error("RATE_LIMITED: ChatGPT returned HTTP 429. Wait before trying again. No prompt was sent.");
  }
  if (status !== undefined && status >= 400) {
    throw new Error(`BROWSER_HTTP_ERROR: ChatGPT returned HTTP ${status}. No prompt was sent.`);
  }
}
