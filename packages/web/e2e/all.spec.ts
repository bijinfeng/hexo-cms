import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupAnonymousApp, setupAuthenticatedApp } from "./helpers";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const headless = process.env.E2E_HEADLESS !== "false";

let browser: Browser;
let context: BrowserContext;
let page: Page;

async function expectVisible(locator: Locator, timeout = 10_000) {
  await locator.first().waitFor({ state: "visible", timeout });
}

beforeAll(async () => {
  browser = await chromium.launch({ headless });
}, 30_000);

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  context = await browser.newContext({ baseURL });
  page = await context.newPage();
});

afterEach(async () => {
  await context.close();
});

describe("Login", () => {
  it("renders login page", async () => {
    await setupAnonymousApp(page);
    await page.goto("/login");
    await expectVisible(page.locator("text=HexoCMS"), 15_000);
  });

  it("redirects from / to /login", async () => {
    await setupAnonymousApp(page);
    await page.goto("/");
    await page.waitForURL("**/login", { timeout: 15_000 });
  });

  it("redirects from /posts to /login", async () => {
    await setupAnonymousApp(page);
    await page.goto("/posts");
    await page.waitForURL("**/login", { timeout: 15_000 });
  });
});

describe("Navigation", () => {
  beforeEach(async () => {
    await setupAuthenticatedApp(page);
  });

  it("dashboard shows stats", async () => {
    await page.goto("/");
    await expectVisible(page.getByRole("heading", { name: "数据大盘" }), 10_000);
    await expectVisible(page.locator("text=文章总数"), 5_000);
  });

  it("posts page shows post list", async () => {
    await page.goto("/posts");
    await expectVisible(page.getByRole("heading", { name: "文章管理" }), 10_000);
    await expectVisible(page.locator("text=Hello World"), 5_000);
    await expectVisible(page.locator("text=TanStack Start Guide"));
  });

  it("tags page shows tags", async () => {
    await page.goto("/tags");
    await expectVisible(page.getByRole("heading", { name: "标签 & 分类" }), 10_000);
    await expectVisible(page.locator("text=react"), 5_000);
  });

  it("media page loads", async () => {
    await page.goto("/media");
    await expectVisible(page.getByRole("heading", { name: "媒体库" }), 10_000);
  });
});

describe("Settings", () => {
  beforeEach(async () => {
    await setupAuthenticatedApp(page);
  });

  it("displays settings tabs", async () => {
    await page.goto("/settings");
    await expectVisible(page.getByRole("heading", { name: "站点设置" }), 10_000);
    await expectVisible(page.locator("text=GitHub 集成"));
  });

  it("can switch to GitHub tab", async () => {
    await page.goto("/settings");
    await page.locator("text=GitHub 集成").first().click();
    const ownerInput = page.locator('input[placeholder="owner"]');

    await ownerInput.waitFor({ state: "visible", timeout: 5_000 });
    await expect.poll(async () => ownerInput.inputValue(), { timeout: 5_000 }).toBe("test-user");
  });
});
