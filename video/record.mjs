/**
 * Records each scene of the demo video as a webm, driving a real browser through the real app.
 * Usage: node record.mjs <base url> <audio dir with lengths.json> <out dir>
 * Each scene lasts as long as its voiceover, so the actions are paced to it.
 */
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, renameSync } from "node:fs";
// Playwright is installed next to where you run the script (not in the app), so resolve it from the working directory.
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");
const [BASE, AUDIO, OUT] = process.argv.slice(2);
const lengths = JSON.parse(readFileSync(`${AUDIO}/lengths.json`, "utf8"));
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PAD = 1.2; // seconds of picture after the voice ends

const offsets = {};
const cuts = {};
const markTimes = {};
const markedAt = (id) => markTimes[id];

async function scene(browser, id, run) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: `${OUT}/raw-${id}`, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  const started = Date.now();
  let marked = started;
  // run() calls mark() once the first page has loaded; the picture before that moment (a blank page) is cut from the video.
  await run(page, () => { marked = Date.now(); markTimes[id] = marked; offsets[id] = (marked - started) / 1000; });
  const left = (lengths[id] + PAD) * 1000 - (Date.now() - marked);
  if (left > 0) await wait(left);
  const video = page.video();
  await ctx.close();
  renameSync(await video.path(), `${OUT}/${id}.webm`);
  console.log(id, "recorded", ((Date.now() - started) / 1000).toFixed(1), "s, picture starts at", (offsets[id] ?? 0).toFixed(1), "s");
}

const smoothScroll = async (page, to, ms) => {
  await page.evaluate(([y, d]) => new Promise((res) => { const y0 = scrollY, t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / d); scrollTo(0, y0 + (y - y0) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }), [to, ms]);
};

const browser = await chromium.launch({ channel: "chrome" });
const mission = await (await fetch(`${BASE}/api/mission`)).json();
const sealedHref = mission.alerts.find((a) => a.k === "SEALED")?.href ?? "/p/37-01-05-001";
const materialHref = mission.materials.problems.find((p) => p.kind === "differs")?.code;

// 1. The problem: home page and the map
await scene(browser, "s1", async (page, mark) => {
  await page.goto(BASE, { waitUntil: "load" });
  await wait(2500);
  mark();
  await wait(4500);
  await smoothScroll(page, 420, 5000);
  await wait(3000);
  await smoothScroll(page, 0, 4000);
});

// 2. At the polling unit: the real animated story from the system sketch
await scene(browser, "s2", async (page, mark) => {
  await page.goto(`${BASE}/sketch`, { waitUntil: "load" });
  await wait(1500);
  mark();
  await page.evaluate(() => document.querySelector('[aria-label="How a changed number is caught"]').scrollIntoView({ block: "start" }));
  await wait(400);
  await page.getByRole("button", { name: /Replay/ }).click();
  await wait(9000);
});

// 3. Anyone can check: a sealed unit, in Hausa
await scene(browser, "s3", async (page, mark) => {
  await page.goto(`${BASE}${sealedHref}?lang=ha`, { waitUntil: "load" });
  await wait(2000);
  mark();
  await smoothScroll(page, 260, 2200);
});

// 4. The moment: rig it, then mission control
await scene(browser, "s4", async (page, mark) => {
  await page.goto(`${BASE}/rig`, { waitUntil: "load" });
  await wait(2500);
  mark();
  await wait(1500);
  await page.locator("td button").nth(1).click();
  await wait(1200);
  await page.getByRole("button", { name: /Announce the changed total/ }).click();
  await wait(5200);
  await page.goto(`${BASE}/mission`, { waitUntil: "load" });
  await wait(9000);
});

// 5. Before the vote: materials shortfall and priority help
await scene(browser, "s5", async (page, mark) => {
  await page.goto(`${BASE}/mission`, { waitUntil: "load" });
  await wait(2500);
  mark();
  await page.evaluate(() => document.querySelector('[class*="grid gap-4 sm:grid-cols-2"]')?.scrollIntoView({ block: "center" }));
  await wait(4000);
  if (materialHref) {
    await page.goto(`${BASE}/p/${materialHref}`, { waitUntil: "load" });
    await page.evaluate(() => document.querySelector('[aria-label="Election materials"]')?.scrollIntoView({ block: "center" }));
    await wait(4500);
    await page.evaluate(() => document.querySelector('[aria-label="Need priority help to vote?"]')?.scrollIntoView({ block: "center" }));
  }
});

// 6. Rumour check
await scene(browser, "s6", async (page, mark) => {
  await page.goto(`${BASE}/check`, { waitUntil: "load" });
  await wait(1500);
  mark();
  await page.locator("textarea").click();
  await page.locator("textarea").pressSequentially("Apc cheated ??", { delay: 90 });
  const t0 = Date.now();
  await page.getByRole("button", { name: /Check this message/ }).click();
  const clicked = (Date.now() - t0) / 1000;
  await page.getByText(/No verdict on who cheated/).waitFor({ timeout: 60000 });
  // The answer can take many seconds; the video speeds up the wait. These two moments say where it starts and ends.
  cuts.s6 = { from: clicked + 0.8, to: (Date.now() - t0) / 1000 - 0.4, offsetFromMark: (t0 - markedAt("s6")) / 1000 };
  await page.evaluate(() => scrollTo({ top: 200, behavior: "smooth" }));
  await wait(3500);
});

// 7. Close
await scene(browser, "s7", async (page, mark) => {
  await page.goto(BASE, { waitUntil: "load" });
  await wait(2500);
  mark();
});

await browser.close();
import { writeFileSync } from "node:fs";
writeFileSync(`${OUT}/offsets.json`, JSON.stringify(offsets));
writeFileSync(`${OUT}/cuts.json`, JSON.stringify(cuts));
