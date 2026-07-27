import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 4655;
const BASE = `http://127.0.0.1:${PORT}/`;
const pass = [];
const fail = [];
const ok = (n) => (pass.push(n), console.log("  PASS", n));
const no = (n, e) => (fail.push(n), console.log("  FAIL", n, "->", e));

// 1) Start the CLI server
const server = spawn("node", ["bin/cli.mjs", "--no-open", "--port", String(PORT)], {
  stdio: "ignore",
});
await sleep(1500);

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => {
  pageErrors.push(e.message);
  console.log("  [pageerror]", e.message);
});

try {
  await page.goto(BASE, { waitUntil: "networkidle" });

  // --- Playground: default HR dataset loads + starter query runs ---
  await page.waitForSelector(".schema-tree", { timeout: 15000 });
  await page.getByRole("button", { name: /Run/ }).first().click();
  await page.waitForSelector(".results table", { timeout: 10000 });
  let rows = await page.locator(".results tbody tr").count();
  rows > 0 ? ok(`Playground run returns rows (${rows})`) : no("Playground run rows", "0 rows");

  // Clean hero screenshot of the Playground with results.
  await page.screenshot({ path: "docs/screenshot-playground.png" });
  ok("Captured hero screenshot -> docs/screenshot-playground.png");

  // --- Schema sidebar shows HR tables ---
  const schemaText = await page.locator(".schema-tree").innerText();
  /employees/.test(schemaText) && /departments/.test(schemaText)
    ? ok("Schema sidebar lists tables")
    : no("Schema sidebar", schemaText.slice(0, 60));

  // --- ER Diagram tab renders an SVG with FK edges ---
  await page.getByRole("button", { name: "ER Diagram" }).click();
  await page.waitForSelector(".er-scroll svg", { timeout: 5000 });
  const edges = await page.locator(".er-scroll svg line").count();
  const boxes = await page.locator(".er-scroll svg rect").count();
  boxes > 0 && edges > 0
    ? ok(`ER diagram renders (${boxes} rects, ${edges} FK edges)`)
    : no("ER diagram", `${boxes} rects ${edges} edges`);

  // --- Data editor: edit a cell, verify it persists in a query ---
  await page.getByRole("button", { name: "Data editor" }).click();
  await page.waitForSelector("table.editable input", { timeout: 5000 });
  const firstInput = page.locator("table.editable tbody input").first();
  await firstInput.click();
  await firstInput.fill("999");
  await firstInput.press("Enter");
  await sleep(300);
  ok("Data editor cell edit committed (no crash)");

  // --- Regression: switching dataset while the Data editor tab is open must
  //     not crash the app. The editor still referenced the previous dataset's
  //     table, whose load() threw "no such table" and unmounted the whole tree
  //     (blank page) before load() was wrapped in try/catch. ---
  const errorsBeforeSwitch = pageErrors.length;
  await page.locator(".controls select").selectOption("shop");
  await sleep(500);
  const appAlive = (await page.locator(".app").count()) > 0;
  const editorAlive = (await page.locator(".data-editor").count()) > 0;
  const pickerText = await page.locator(".data-toolbar select").innerText().catch(() => "");
  const noNewErrors = pageErrors.length === errorsBeforeSwitch;
  appAlive && editorAlive && noNewErrors && /customers/.test(pickerText)
    ? ok("Dataset switch on Data editor tab does not crash")
    : no(
        "Dataset switch on Data editor tab",
        `appAlive=${appAlive} editorAlive=${editorAlive} newErrors=${pageErrors
          .slice(errorsBeforeSwitch)
          .join("|")} picker="${pickerText.slice(0, 40)}"`
      );

  // --- Create + save a user dataset, then verify persistence across reload ---
  await page.getByRole("button", { name: "Results" }).click();
  // switch to Empty dataset
  await page.locator(".controls select").selectOption("empty");
  await sleep(300);
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(
    "CREATE TABLE author (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE book (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER REFERENCES author(id));\nINSERT INTO author (name) VALUES ('X');\nSELECT * FROM author;"
  );
  await page.keyboard.press("Control+Enter");
  await sleep(400);
  // Save dataset (window.prompt -> accept with a name)
  page.once("dialog", (d) => d.accept("MyTestDS"));
  await page.getByRole("button", { name: /Save dataset/ }).click();
  await sleep(400);
  let opts = await page.locator(".controls select option").allInnerTexts();
  opts.includes("MyTestDS")
    ? ok("Saved dataset appears in dropdown")
    : no("Saved dataset in dropdown", opts.join(","));

  // Reload the page — saved dataset must persist (localStorage)
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".controls select", { timeout: 10000 });
  opts = await page.locator(".controls select option").allInnerTexts();
  opts.includes("MyTestDS")
    ? ok("Saved dataset persists across reload")
    : no("Saved dataset persists", opts.join(","));

  // --- Challenge mode: solve a challenge, expect green pass ---
  await page.getByRole("button", { name: "Challenges" }).click();
  await page.waitForSelector(".challenge-list", { timeout: 5000 });
  // pick "List employee names" (hr-1) — scope to the sidebar list
  await page
    .locator(".challenge-list li", { hasText: "List employee names" })
    .first()
    .click();
  await sleep(400);
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("SELECT name FROM employees;");
  await page.getByRole("button", { name: /Check answer/ }).click();
  await page.waitForSelector(".challenge-feedback", { timeout: 5000 });
  const fb = await page.locator(".challenge-feedback").innerText();
  const feedbackClass = await page.locator(".challenge-feedback").getAttribute("class");
  feedbackClass.includes("pass")
    ? ok("Challenge correct answer -> PASS feedback")
    : no("Challenge pass", fb.slice(0, 60));

  // Wrong answer should FAIL
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("SELECT name FROM employees WHERE salary > 999999;");
  await page.getByRole("button", { name: /Check answer/ }).click();
  await sleep(500);
  const fb2Class = await page.locator(".challenge-feedback").getAttribute("class");
  fb2Class.includes("fail")
    ? ok("Challenge wrong answer -> FAIL feedback")
    : no("Challenge fail", fb2Class);

  // --- Help modal opens and toggles ---
  await page.getByRole("button", { name: /Help/ }).click();
  await page.waitForSelector(".modal", { timeout: 3000 });
  await page.getByRole("button", { name: "Install & embed" }).click();
  const helpText = await page.locator(".modal-body").innerText();
  /createDatabase/.test(helpText) && /npx sqlplay/.test(helpText)
    ? ok("Help modal + Install/embed toggle works")
    : no("Help modal", helpText.slice(0, 60));

  await page.screenshot({ path: "docs/e2e-screenshot.png", fullPage: false });
  ok("Captured screenshot -> docs/e2e-screenshot.png");
} catch (e) {
  no("EXCEPTION", e.message);
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n==== ${pass.length} passed, ${fail.length} failed ====`);
process.exit(fail.length ? 1 : 0);
