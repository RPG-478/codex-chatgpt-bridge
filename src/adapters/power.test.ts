import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { verifyPower } from "./power.js";

test("Power selects and verifies all five levels, rejecting invalid, mismatched and locked levels", async () => {
  const browser = await chromium.launch({ channel: process.env.CGPT_BROWSER_CHANNEL ?? "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<button class="__composer-pill" aria-haspopup="menu" onclick="document.querySelector('[role=menu]').hidden=false">6 Pro</button>
      <div role="menu" hidden><div role="menuitem" tabindex="0" aria-label="Power" aria-describedby="description"
      onkeydown="if(event.key==='ArrowLeft'||event.key==='ArrowRight'){const s=this.querySelector('[role=slider]');const v=Math.max(0,Math.min(4,Number(s.getAttribute('aria-valuenow'))+(event.key==='ArrowRight'?1:-1)));s.setAttribute('aria-valuenow',String(v));document.getElementById('description').textContent=['Instant','Medium','High','Extra High','Pro'][v]+', '+(v+1)+' of 5.';}">
      Power<span role="slider" aria-valuemin="0" aria-valuemax="4" aria-valuenow="4"></span></div><span id="description">Pro, 5 of 5.</span></div>`);
    const labels = ["Instant", "Medium", "High", "Extra High", "Pro"];
    for (let level = 1; level <= 5; level++) {
      assert.deepEqual(await verifyPower(page, level, true), { level, label: labels[level - 1] });
      assert.deepEqual(await verifyPower(page, level), { level, label: labels[level - 1] });
    }
    await assert.rejects(verifyPower(page, 1), /POWER_UNVERIFIABLE/);
    await assert.rejects(verifyPower(page, 6, true), /POWER_UNVERIFIABLE/);
    await page.getByRole("menuitem", { name: "Power" }).evaluate(n => n.removeAttribute("onkeydown"));
    await assert.rejects(verifyPower(page, 1, true), /Power did not change/);
  } finally { await browser.close(); }
});

test("Power supports a localized three-level control", async () => {
  const browser = await chromium.launch({ channel: process.env.CGPT_BROWSER_CHANNEL ?? "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<button class="__composer-pill" aria-haspopup="menu" onclick="document.querySelector('[role=menu]').hidden=false">高</button>
      <div role="menu" hidden><div role="menuitem" tabindex="0" aria-label="パワー" aria-describedby="description"
      onkeydown="if(event.key==='ArrowLeft'||event.key==='ArrowRight'){const s=this.querySelector('[role=slider]');const v=Math.max(0,Math.min(2,Number(s.getAttribute('aria-valuenow'))+(event.key==='ArrowRight'?1:-1)));s.setAttribute('aria-valuenow',String(v));document.getElementById('description').textContent=['低','中','高'][v]+'、3件中'+(v+1)+'件目。';}">
      パワー<span role="slider" aria-valuemin="0" aria-valuemax="2" aria-valuenow="2"></span></div><span id="description">高、3件中3件目。</span></div>`);
    const labels = ["低", "中", "高"];
    for (let level = 1; level <= 3; level++) {
      assert.deepEqual(await verifyPower(page, level, true), { level, label: labels[level - 1] });
      assert.deepEqual(await verifyPower(page, level), { level, label: labels[level - 1] });
    }
    await assert.rejects(verifyPower(page, 4, true), /exposes 3 level/);
  } finally { await browser.close(); }
});
