import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { verifyModel } from "./model.js";

test("model UI: select, verify, reject missing model and reject changed selection", async () => {
  const browser = await chromium.launch({channel: process.env.CGPT_BROWSER_CHANNEL ?? "chrome", headless: true});
  try {
    const page = await browser.newPage();
    await page.setContent(`<button class="__composer-pill" aria-haspopup="menu" onclick="document.querySelector('[role=menu]').hidden=false">6 Pro</button>
      <div role="menu" hidden><button role="menuitemradio" aria-checked="false"
      onclick="this.setAttribute('aria-checked','true');this.parentElement.hidden=true">GPT-5.6 Sol</button></div>`);
    assert.deepEqual(await verifyModel(page, "GPT-5.6 Sol", true), { model: "GPT-5.6 Sol", displayLabel: "6 Pro" });
    assert.deepEqual(await verifyModel(page, "GPT-5.6 Sol"), { model: "GPT-5.6 Sol", displayLabel: "6 Pro" });
    await assert.rejects(verifyModel(page, "not-a-model", true), /MODEL_UNVERIFIABLE/);
    await assert.rejects(verifyModel(page, "Latest", true), /MODEL_UNVERIFIABLE/);
    await page.getByRole("menuitemradio").evaluate(n => n.setAttribute("aria-checked", "false"));
    await assert.rejects(verifyModel(page, "GPT-5.6 Sol"), /MODEL_UNVERIFIABLE/);
  } finally { await browser.close(); }
});

test("Latest is selected and verified as a dynamic menu label, with its displayed label", async () => {
  const browser = await chromium.launch({channel: process.env.CGPT_BROWSER_CHANNEL ?? "chrome", headless: true});
  try {
    const page = await browser.newPage();
    await page.setContent(`<button class="__composer-pill" aria-haspopup="menu" onclick="document.querySelector('[role=menu]').hidden=false">6\nPro</button>
      <div role="menu" hidden><button role="menuitemradio" aria-checked="false"
      onclick="this.setAttribute('aria-checked','true');this.parentElement.hidden=true">Latest</button></div>`);
    await assert.rejects(verifyModel(page, "Latest"), /MODEL_UNVERIFIABLE/);
    assert.deepEqual(await verifyModel(page, "Latest", true), { model: "Latest", displayLabel: "6 Pro" });
    assert.deepEqual(await verifyModel(page, "Latest"), { model: "Latest", displayLabel: "6 Pro" });
    await assert.rejects(verifyModel(page, "Auto", true), /MODEL_UNVERIFIABLE/);
  } finally { await browser.close(); }
});

test("model UI: opens a localized model submenu by structure", async () => {
  const browser = await chromium.launch({channel: process.env.CGPT_BROWSER_CHANNEL ?? "chrome", headless: true});
  try {
    const page = await browser.newPage();
    await page.setContent(`<button class="__composer-pill" aria-haspopup="menu" onclick="document.querySelector('[role=menu]').hidden=false">高</button>
      <div role="menu" hidden>
        <div role="menuitem" aria-label="モデルを選択" onclick="document.getElementById('models').hidden=false">高</div>
        <div role="menuitem" aria-label="パワー"><span role="slider" aria-valuemin="0" aria-valuemax="2" aria-valuenow="2"></span></div>
        <div id="models" hidden><button role="menuitemradio" aria-checked="false"
        onclick="this.setAttribute('aria-checked','true');this.parentElement.hidden=true">GPT-5.6 Sol</button></div>
      </div>`);
    assert.deepEqual(await verifyModel(page, "GPT-5.6 Sol", true), { model: "GPT-5.6 Sol", displayLabel: "高" });
    assert.deepEqual(await verifyModel(page, "GPT-5.6 Sol"), { model: "GPT-5.6 Sol", displayLabel: "高" });
  } finally { await browser.close(); }
});
