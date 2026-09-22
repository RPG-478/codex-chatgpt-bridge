import type { Page } from "playwright-core";

export async function verifyPower(page: Page, level: number, select = false): Promise<{ level: number; label: string }> {
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new Error("POWER_UNVERIFIABLE: power must be an integer from 1 to 5.");
  const picker = page.locator('button.__composer-pill[aria-haspopup="menu"]')
    .or(page.getByTestId("model-switcher-dropdown-button")).filter({ visible: true });
  try {
    await picker.click({ timeout: 15000 });
    const menu = page.getByRole("menu").filter({ visible: true }).first();
    const control = menu.locator('[role="menuitem"]:has([role="slider"])').filter({ visible: true });
    await control.waitFor({ state: "visible", timeout: 5000 });
    if (await control.count() !== 1) throw new Error("Power control is unavailable or ambiguous.");
    const read = async () => {
      const state = await control.evaluate(node => {
        const slider = node.querySelector('[role="slider"]');
        const description = (node.getAttribute("aria-describedby") ?? "").split(" ")
          .map(id => document.getElementById(id)?.textContent ?? "").join(" ");
        return {
          min: slider?.getAttribute("aria-valuemin"),
          max: slider?.getAttribute("aria-valuemax"),
          value: slider?.getAttribute("aria-valuenow"),
          valueText: slider?.getAttribute("aria-valuetext"),
          description
        };
      });
      const min = Number(state.min);
      const max = Number(state.max);
      const value = Number(state.value);
      if (!Number.isInteger(min) || !Number.isInteger(max) || !Number.isInteger(value) || min !== 0 || max < min || value < min || value > max) {
        throw new Error("The interface does not expose a consistent Power control.");
      }
      const description = (state.valueText || state.description).trim();
      const label = description.split(/[,、]/, 1)[0]?.trim();
      if (!label) throw new Error("The Power control does not expose an accessible level label.");
      return { level: value + 1, label, maxLevel: max + 1 };
    };
    let current = await read();
    if (level > current.maxLevel) throw new Error(`Requested level ${level}, but this interface exposes ${current.maxLevel} level(s).`);
    if (select) {
      for (let step = 0; current.level !== level && step < current.maxLevel - 1; step++) {
        const previous = current.level;
        await control.press(current.level < level ? "ArrowRight" : "ArrowLeft");
        current = await read();
        if (current.level === previous) throw new Error("Power did not change; the requested level may be unavailable.");
      }
      await page.keyboard.press("Escape");
      await picker.click();
      current = await read();
    }
    if (current.level !== level) throw new Error(`Requested level ${level}, but the interface reports ${current.level}.`);
    return { level: current.level, label: current.label };
  } catch (error) {
    throw new Error(`POWER_UNVERIFIABLE: ${error instanceof Error ? error.message : String(error)}`);
  } finally { await page.keyboard.press("Escape").catch(() => undefined); }
}
