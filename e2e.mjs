import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import assert from "node:assert/strict";

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

const ready = () => page.waitForFunction(() => {
  const picker = document.querySelector(".controls select");
  return picker && !picker.disabled;
});
const execute = async (sql) => {
  await ready();
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(sql);
  await page.keyboard.press("Control+Enter");
  await page.waitForSelector(".results");
};
const resultRows = () => page.locator(".results tbody tr").evaluateAll((rows) =>
  rows.map((row) => [...row.querySelectorAll("td:not(.rownum)")].map((cell) => cell.textContent))
);
const reset = async (name, accept = true) => {
  page.once("dialog", (dialog) => accept ? dialog.accept() : dialog.dismiss());
  await page.getByRole("button", { name, exact: true }).click();
  await ready();
};

try {
  await page.goto(BASE, { waitUntil: "networkidle" });

  // --- Playground: default Tasks dataset loads + starter query runs ---
  await page.waitForSelector(".schema-tree", { timeout: 15000 });
  await ready();
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");
  const starter = await page.locator(".cm-content").innerText();
  assert.match(starter, /LEFT JOIN user/);
  await page.getByRole("button", { name: /Run/ }).first().click();
  await page.waitForSelector(".results table", { timeout: 10000 });
  let rows = await page.locator(".results tbody tr").count();
  rows > 0 ? ok(`Playground run returns rows (${rows})`) : no("Playground run rows", "0 rows");
  assert.equal(rows, 35);
  assert.equal(await page.locator(".results .null-cell").filter({ hasText: "NULL" }).count(), 10);

  await execute("SELECT (SELECT COUNT(*) FROM user), (SELECT COUNT(*) FROM status), (SELECT COUNT(*) FROM task), (SELECT COUNT(*) FROM tag), (SELECT COUNT(*) FROM task_tag);");
  assert.deepEqual(await resultRows(), [["12", "3", "35", "5", "12"]]);
  await execute("SELECT id, name, email, phone FROM user WHERE id >= 9 ORDER BY id;");
  assert.deepEqual(await resultRows(), [
    ["9", "王秀英", "wang.xiuying@weebly.com", "891-952-6749"],
    ["10", "إلياس", "elias@github.com", "202-517-6983"],
    ["11", "Donald Duck", "donald@duck.com", "NULL"],
    ["12", "Adam Smith", "smith@bla.com", "NULL"],
  ]);
  await execute("SELECT * FROM task WHERE id IN (1, 10, 23, 24, 25, 29, 35) ORDER BY id;");
  assert.deepEqual(await resultRows(), [
    ["1", "Wash clothes", "Title says it all.", "2017-10-25 06:54:16", "2017-10-15 13:05:09", "NULL", "2", "1"],
    ["10", "Do HackYourFuture assginment", "NULL", "2017-10-04 13:55:16", "2017-10-10 00:18:05", "2017-12-19 17:01:10", "1", "3"],
    ["23", "Buy new phone", "The battery in the current one only lasts 5 hours 😞", "2017-09-17 00:25:34", "2017-10-09 11:48:12", "NULL", "3", "NULL"],
    ["24", "Ride bike aroud Sjælland", "Remember rainclothes and tire repair kit!", "2017-10-20 19:21:13", "2017-10-07 01:38:06", "2017-12-19 15:08:18", "2", "7"],
    ["25", "Look at apartments in Ørestad", "2 or 3 rooms", "2017-10-30 09:47:00", "2017-10-19 06:11:26", "NULL", "1", "6"],
    ["29", "Sign up for LinkedIn", "Make the CV awesome! 😄", "2017-09-04 00:57:47", "2017-10-18 18:07:48", "2017-12-07 23:04:38", "3", "2"],
    ["35", "Learn about NoSQL databases", "MongoDB, CouchDB, etc.", "2017-10-20 01:41:53", "2017-10-04 07:19:56", "2017-12-23 10:13:42", "2", "NULL"],
  ]);
  await execute("PRAGMA foreign_keys;");
  assert.deepEqual(await resultRows(), [["1"]]);
  await execute('SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info("task");');
  assert.deepEqual(await resultRows(), [
    ["id", "INTEGER", "0", "NULL", "1"],
    ["title", "varchar(255)", "1", "NULL", "0"],
    ["description", "TEXT", "0", "NULL", "0"],
    ["created", "DATETIME", "1", "NULL", "0"],
    ["updated", "DATETIME", "1", "NULL", "0"],
    ["due_date", "DATETIME", "0", "NULL", "0"],
    ["status_id", "INTEGER", "1", "NULL", "0"],
    ["user_id", "INTEGER", "0", "NULL", "0"],
  ]);
  await execute("UPDATE task SET user_id = 999 WHERE id = 1;");
  assert.match(await page.locator(".result-error").innerText(), /FOREIGN KEY/);
  await execute("INSERT INTO task_tag VALUES (1, 4);");
  assert.match(await page.locator(".result-error").innerText(), /UNIQUE/);
  await execute("INSERT INTO task_tag VALUES (999, 1);");
  assert.match(await page.locator(".result-error").innerText(), /FOREIGN KEY/);
  await execute("DELETE FROM user WHERE id = 1; DELETE FROM tag WHERE id = 3; DELETE FROM status WHERE id = 3; SELECT (SELECT COUNT(*) FROM task WHERE user_id = 1 OR status_id = 3), (SELECT COUNT(*) FROM task_tag WHERE task_id IN (1, 2, 4, 12) OR tag_id = 3);");
  assert.deepEqual(await resultRows(), [["0", "0"]]);
  ok("Original Tasks counts, Unicode, nullable values, timestamps and FK constraints/cascades");

  await reset("Reset to Tasks database");
  await execute("SELECT * FROM task ORDER BY id;");
  const pristineTasks = await resultRows();
  await execute("UPDATE task SET title = 'Changed' WHERE id = 1; DELETE FROM task WHERE id = 2; INSERT INTO tag VALUES (6, 'Extra'); DROP TABLE task_tag; CREATE TABLE extra (id INTEGER);");
  await page.locator('input[type="file"]').setInputFiles({
    name: "reset_import.json", mimeType: "application/json",
    buffer: Buffer.from('[{"id":1,"name":"Imported"}]'),
  });
  await page.waitForFunction(() => document.querySelector(".status-text").textContent.includes('Imported "reset_import.json"'));
  assert.match(await page.locator(".schema-tree").innerText(), /reset_import/);
  const beforeCancel = await page.locator(".schema-tree").innerText();
  const queryBeforeCancel = await page.locator(".cm-content").innerText();
  const resultsBeforeCancel = await page.locator(".results").innerText();
  const statusBeforeCancel = await page.getByRole("status").innerText();
  for (const name of ["Reset current dataset", "Reset to Tasks database"]) {
    await reset(name, false);
    assert.equal(await page.locator(".schema-tree").innerText(), beforeCancel);
    assert.equal(await page.locator(".cm-content").innerText(), queryBeforeCancel);
    assert.equal(await page.locator(".results").innerText(), resultsBeforeCancel);
    assert.equal(await page.getByRole("status").innerText(), statusBeforeCancel);
  }
  await reset("Reset current dataset");
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");
  await execute("SELECT * FROM task ORDER BY id;");
  assert.deepEqual(await resultRows(), pristineTasks);
  for (let i = 0; i < 5; i++) {
    await reset("Reset to Tasks database");
    assert.equal(await page.locator(".controls select").inputValue(), "tasks");
    assert.equal(await page.locator(".cm-content").innerText(), starter);
    assert.equal(await page.locator(".results").count(), 0);
    assert.doesNotMatch(await page.locator(".schema-tree").innerText(), /extra/);
    assert.doesNotMatch(await page.locator(".schema-tree").innerText(), /reset_import/);
    await execute("SELECT * FROM task ORDER BY id;");
    assert.deepEqual(await resultRows(), pristineTasks);
  }
  await page.locator(".controls select").selectOption("shop");
  await ready();
  await execute("DELETE FROM customers;");
  await reset("Reset current dataset");
  assert.equal(await page.locator(".controls select").inputValue(), "shop");
  await execute("SELECT COUNT(*) FROM customers;");
  assert.deepEqual(await resultRows(), [["5"]]);
  await reset("Reset to Tasks database");
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");
  await page.getByRole("button", { name: /Run/ }).first().click();
  assert.equal(await page.locator(".results tbody tr").count(), 35);
  ok("Both reset modes, cancellation, pristine schema/data and repeated resets");

  // Clean hero screenshot of the Playground with results.
  await page.screenshot({ path: "docs/screenshot-playground.png" });
  ok("Captured hero screenshot -> docs/screenshot-playground.png");

  // --- Schema sidebar shows Tasks tables ---
  const schemaText = await page.locator(".schema-tree").innerText();
  /task_tag/.test(schemaText) && /user/.test(schemaText)
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
  await page.locator(".data-toolbar select").selectOption("task");
  await page.getByRole("button", { name: /Add row/ }).click();
  assert.equal(await page.locator(".draft-row").count(), 1);
  await reset("Reset to Tasks database");
  assert.equal(await page.locator(".draft-row").count(), 0);
  assert.equal(await page.locator(".data-msg").innerText(), "");
  await page.locator(".data-toolbar select").selectOption("task");
  assert.equal(await page.locator("table.editable tbody tr").count(), 35);
  assert.equal(await page.locator("table.editable tbody tr").first().locator("input").nth(1).inputValue(), "Wash clothes");
  ok("Reset refreshes Data editor and clears stale selection/draft/feedback");

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
  const savedId = await page.locator(".controls select").inputValue();
  const savedSnapshot = await page.evaluate(() => localStorage.getItem("sqlplay.userDatasets.v1"));
  await execute("UPDATE author SET name = 'unsaved'; CREATE TABLE unsaved (id INTEGER);");
  await reset("Reset current dataset");
  assert.equal(await page.locator(".controls select").inputValue(), savedId);
  await execute("SELECT name FROM author;");
  assert.deepEqual(await resultRows(), [["X"]]);
  assert.doesNotMatch(await page.locator(".schema-tree").innerText(), /unsaved/);
  await execute("DROP TABLE author;");
  const historyBeforeReset = await page.evaluate(() => localStorage.getItem("sqlplay.history.v1"));
  await reset("Reset to Tasks database");
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");
  assert.equal(await page.locator(".cm-content").innerText(), starter);
  assert.equal(await page.evaluate(() => localStorage.getItem("sqlplay.userDatasets.v1")), savedSnapshot);
  assert.equal(await page.evaluate(() => localStorage.getItem("sqlplay.history.v1")), historyBeforeReset);
  await page.locator(".controls select").selectOption(savedId);
  await ready();
  await execute("SELECT name FROM author;");
  assert.deepEqual(await resultRows(), [["X"]]);
  ok("Saved snapshot resets retain identity; Tasks reset leaves snapshots/history intact");

  // Corrupt a snapshot without changing the active DB; a failed reset must not swap it.
  await page.evaluate(() => {
    const datasets = JSON.parse(localStorage.getItem("sqlplay.userDatasets.v1"));
    datasets[0].b64 = btoa("not a SQLite database");
    localStorage.setItem("sqlplay.userDatasets.v1", JSON.stringify(datasets));
  });
  await reset("Reset current dataset");
  assert.match(await page.getByRole("status").innerText(), /Failed to load dataset/);
  assert.equal(await page.locator(".controls select").inputValue(), savedId);
  await execute("SELECT name FROM author;");
  assert.deepEqual(await resultRows(), [["X"]]);
  await page.evaluate((snapshot) => localStorage.setItem("sqlplay.userDatasets.v1", snapshot), savedSnapshot);
  ok("Failed snapshot reset preserves the active database");

  // Reload the page — saved dataset must persist (localStorage)
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".controls select", { timeout: 10000 });
  opts = await page.locator(".controls select option").allInnerTexts();
  opts.includes("MyTestDS")
    ? ok("Saved dataset persists across reload")
    : no("Saved dataset persists", opts.join(","));
  await ready();
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");

  const shared = Buffer.from(JSON.stringify({ datasetId: "hr", query: "SELECT name FROM employees;" })).toString("base64url");
  await page.goto(`${BASE}#s=${shared}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await ready();
  assert.equal(await page.locator(".controls select").inputValue(), "hr");
  assert.equal(await page.locator(".cm-content").innerText(), "SELECT name FROM employees;");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await ready();
  ok("Default startup and intentional shared-link dataset/query overrides");
  const missingSaved = Buffer.from(JSON.stringify({ datasetId: "user:missing", query: "SELECT COUNT(*) FROM task;" })).toString("base64url");
  await page.goto(`${BASE}#s=${missingSaved}`, { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await ready();
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");
  await page.locator(".controls select").selectOption(savedId);
  await ready();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await ready();
  assert.equal(await page.locator(".controls select").inputValue(), "tasks");
  assert.equal(await page.locator(".cm-content").innerText(), starter);
  ok("Missing/deleted saved datasets fall back to Tasks");

  // Inject a seed error after CREATE succeeds, using the built app's existing asset.
  const errorPage = await browser.newPage();
  await errorPage.route("**/assets/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({ response, body: body.replace(
      "INSERT INTO departments (", "INVALID SEED SQL; INSERT INTO departments ("
    ) });
  });
  await errorPage.goto(BASE, { waitUntil: "networkidle" });
  await errorPage.waitForFunction(() => !document.querySelector(".controls select")?.disabled);
  await errorPage.locator(".controls select").selectOption("hr");
  await errorPage.waitForFunction(() => !document.querySelector(".controls select")?.disabled);
  assert.match(await errorPage.getByRole("status").innerText(), /Failed to load dataset/);
  assert.equal(await errorPage.locator(".controls select").inputValue(), "tasks");
  await errorPage.getByRole("button", { name: /Run/ }).first().click();
  assert.equal(await errorPage.locator(".results tbody tr").count(), 35);
  await errorPage.close();
  ok("StatementOutcome seed errors preserve active database instead of claiming success");
  const startupErrorPage = await browser.newPage();
  await startupErrorPage.route("**/assets/*.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      "INSERT INTO user (", "INVALID SEED SQL; INSERT INTO user ("
    ) });
  });
  await startupErrorPage.goto(BASE, { waitUntil: "networkidle" });
  await startupErrorPage.waitForFunction(() => !document.querySelector(".controls select")?.disabled);
  assert.match(await startupErrorPage.getByRole("status").innerText(), /Failed to load dataset/);
  assert.equal(await startupErrorPage.getByRole("button", { name: /Run/ }).first().isDisabled(), true);
  assert.equal((await startupErrorPage.locator(".cm-content").innerText()).trim(), "");
  assert.equal(await startupErrorPage.locator(".schema-tree").count(), 0);
  assert.match(await startupErrorPage.locator(".schema-empty").innerText(), /No tables yet/);
  await startupErrorPage.close();
  ok("Failed startup does not install or report success for a partial seed");

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
  const solvedBeforeReset = await page.evaluate(() => localStorage.getItem("sqlplay.solved.v1"));
  assert.equal(await page.getByRole("button", { name: "Reset to Tasks database", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Playground", exact: true }).click();
  await reset("Reset to Tasks database");
  assert.equal(await page.evaluate(() => localStorage.getItem("sqlplay.solved.v1")), solvedBeforeReset);
  ok("Challenge behavior and solved progress survive Playground resets");

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
