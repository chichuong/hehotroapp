import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const tokenPath = path.join(root, "ahp_token.txt");
const token = fs.readFileSync(tokenPath, "utf-8").trim();

const sampleValues = [3, 5, 7, 2, 2, 4, 3, 2, 2, 3];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

await context.addInitScript((t) => {
  window.localStorage.setItem("access_token", t);
}, token);

const page = await context.newPage();
await page.goto("http://127.0.0.1:5173/dss/ahp", { waitUntil: "networkidle" });

await page.waitForSelector('h2:has-text("Ma trận so sánh cặp")');

const criteriaTable = page.locator("table").first();
const headers = await criteriaTable.locator("thead th").allTextContents();
const matrixRowCount = await criteriaTable.locator("tbody tr").count();

const inputs = criteriaTable.locator('input[type="number"]');
const inputCount = await inputs.count();
for (let i = 0; i < Math.min(inputCount, sampleValues.length); i++) {
  await inputs.nth(i).fill(String(sampleValues[i]));
  await inputs.nth(i).blur();
}

const reciprocalChecks = {
  r1c0: await criteriaTable.locator("tbody tr").nth(1).locator("td").nth(1).innerText(),
  r2c0: await criteriaTable.locator("tbody tr").nth(2).locator("td").nth(1).innerText(),
  r3c0: await criteriaTable.locator("tbody tr").nth(3).locator("td").nth(1).innerText(),
  r4c0: await criteriaTable.locator("tbody tr").nth(4).locator("td").nth(1).innerText(),
};

await page.getByRole("button", { name: "Lưu ma trận so sánh" }).click();
await page.waitForSelector('text=Đã lưu ma trận so sánh thành công!');

await page.waitForSelector('h2:has-text("Trọng số tiêu chí")');
const lambdaText = await page.locator("text=λ max").locator("xpath=..//p[2]").first().innerText();
const ciText = await page.locator("text=CI").locator("xpath=..//p[2]").first().innerText();
const crText = await page.locator("text=CR").locator("xpath=..//p[2]").first().innerText();
const consistentText = await page.locator("text=Nhất quán").locator("xpath=..//p[2]").first().innerText();

await page.getByRole("button", { name: "Gợi ý bất động sản" }).click();
await page.waitForSelector('h2:has-text("Top 5 phương án phù hợp")');
await page.waitForSelector('h2:has-text("Ma trận phương án")');
await page.waitForSelector('h2:has-text("Kết quả xếp hạng bất động sản")');

const rankingItems = page.locator("h2:has-text('Kết quả xếp hạng bất động sản') + ol li");
const rankingCount = await rankingItems.count();

const allTables = page.locator("table");
const tableCount = await allTables.count();
const alternativeTable = allTables.nth(1);
const altHeaderCount = await alternativeTable.locator("thead th").count();
const altRowCount = await alternativeTable.locator("tbody tr").count();

const screenshotPath = path.join(root, "ahp_ui_verification.png");
await page.screenshot({ path: screenshotPath, fullPage: true });

const result = {
  pageTitle: await page.title(),
  headingsPresent: {
    matrix: await page.locator('h2:has-text("Ma trận so sánh cặp")').count(),
    weights: await page.locator('h2:has-text("Trọng số tiêu chí")').count(),
    top5: await page.locator('h2:has-text("Top 5 phương án phù hợp")').count(),
    alternatives: await page.locator('h2:has-text("Ma trận phương án")').count(),
    ranking: await page.locator('h2:has-text("Kết quả xếp hạng bất động sản")').count(),
  },
  criteriaMatrix: {
    headers,
    rowCount: matrixRowCount,
    editableUpperTriangleInputs: inputCount,
    reciprocalChecks,
  },
  weightsSummaryUI: {
    lambdaText,
    ciText,
    crText,
    consistentText,
  },
  alternativesSection: {
    tableCount,
    alternativeTableHeaderCount: altHeaderCount,
    alternativeTableRowCount: altRowCount,
    rankingCount,
  },
  screenshotPath,
};

fs.writeFileSync(path.join(root, "ahp_ui_check.json"), JSON.stringify(result, null, 2), "utf-8");
console.log(JSON.stringify(result, null, 2));

await browser.close();
