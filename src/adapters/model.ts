import type { Page } from "playwright-core";

// Exact UI labels, never API aliases or a model's self-description.
export async function verifyModel(page: Page, model: string, select = false): Promise<{ model: string; displayLabel: string }> {
  if (!model.trim() || /^auto$/i.test(model.trim())) {
    throw new Error("MODEL_UNVERIFIABLE: request a model menu label, such as Latest; Auto is not supported.");
  }
  const picker = page.locator('button.__composer-pill[aria-haspopup="menu"]')
    .or(page.getByTestId("model-switcher-dropdown-button")).filter({ visible: true });
  try {
    await picker.first().waitFor({ state: "visible", timeout: 15_000 });
    if (await picker.count() !== 1) throw new Error("Model selector is ambiguous.");
    await picker.click();
    const choice = page.getByRole("menuitemradio", { name: model, exact: true });
    const openModels = async () => {
      if (await choice.isVisible().catch(() => false)) return;
      const menu = page.getByRole("menu").filter({ visible: true }).first();
      const submenu = menu.locator('[role="menuitem"]:not(:has([role="slider"]))').filter({ visible: true });
      if (await submenu.count() !== 1) throw new Error("Model submenu is unavailable or ambiguous.");
      await submenu.click();
    };
    await openModels();
    await page.getByRole("menu").first().waitFor({ state: "visible", timeout: 5_000 });
    if (await choice.count() !== 1 || !await choice.isVisible() || !await choice.isEnabled()) {
      throw new Error(`Model ${JSON.stringify(model)} is unavailable as an exact selectable UI label.`);
    }
    if (select && await choice.getAttribute("aria-checked") !== "true") {
      await choice.click();
      // Reopen to read the persisted selection rather than trusting the click.
      await page.keyboard.press("Escape");
      await picker.click();
      await openModels();
    }
    if (await choice.getAttribute("aria-checked") !== "true") {
      throw new Error(`The interface does not confirm ${JSON.stringify(model)} as selected.`);
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => {
      const button = document.querySelector('button.__composer-pill[aria-haspopup="menu"], [data-testid="model-switcher-dropdown-button"]');
      const text = button?.textContent?.trim();
      return text && text !== "Thinking effort";
    }, undefined, { timeout: 5000 });
    const displayLabel = (await picker.innerText()).replace(/\s+/g, " ").trim();
    if (!displayLabel) throw new Error("The selected model's display label is empty.");
    return { model, displayLabel };
  } catch (error) {
    throw new Error(`MODEL_UNVERIFIABLE: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
}
