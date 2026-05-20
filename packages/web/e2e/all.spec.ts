import {
  type Browser,
  type BrowserContext,
  chromium,
  type Locator,
  type Page,
} from "@playwright/test";
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

async function fillEditor(page: Page, text: string) {
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await editor.fill(text);
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

  it("shows editor preferences tab", async () => {
    await page.goto("/settings");
    await expectVisible(page.locator("text=编辑器偏好"), 10_000);
  });

  it("can switch to editor preferences tab", async () => {
    await page.goto("/settings");
    await page.locator("text=编辑器偏好").first().click();
    await expectVisible(page.getByText("字体大小"), 5_000);
    await expectVisible(page.getByText("编辑器主题"), 5_000);
    await expectVisible(page.getByText("自动保存间隔"), 5_000);
  });
});

describe("Posts CRUD", () => {
  beforeEach(async () => {
    await setupAuthenticatedApp(page);
  });

  it("navigates to new post page", async () => {
    await page.goto("/posts");
    await expectVisible(page.getByRole("heading", { name: "文章管理" }), 10_000);
    await page.locator("text=新建文章").first().click();
    await page.waitForURL("**/posts/new", { timeout: 10_000 });
    await expectVisible(page.locator("text=保存草稿"), 5_000);
    await expectVisible(page.locator("text=发布"), 5_000);
  });

  it("creates a new post as draft", async () => {
    await page.goto("/posts/new");
    await expectVisible(page.locator("text=保存草稿"), 10_000);

    const titleInput = page.locator('input[placeholder="文章标题..."]');
    await titleInput.fill("E2E Test Post");
    await fillEditor(page, "This is a test post created by E2E.");

    await page.locator("text=保存草稿").first().click();

    await page.waitForURL("**/posts/**", { timeout: 10_000 });
  });

  it("publishes a new post", async () => {
    await page.goto("/posts/new");
    await expectVisible(page.locator("text=发布"), 10_000);

    const titleInput = page.locator('input[placeholder="文章标题..."]');
    await titleInput.fill("E2E Published Post");
    await fillEditor(page, "This is a published test post.");

    await page.locator("text=发布").first().click();

    await page.waitForURL("**/posts/**", { timeout: 10_000 });
  });

  it("edits an existing post", async () => {
    await page.goto("/posts");
    await expectVisible(page.getByRole("heading", { name: "文章管理" }), 10_000);

    await page.locator("text=Hello World").first().click();
    await page.waitForURL("**/posts/hello-world**", { timeout: 10_000 });

    await expectVisible(page.locator("text=保存"), 10_000);

    const titleInput = page.locator('input[placeholder="文章标题..."]');
    await titleInput.clear();
    await titleInput.fill("Hello World Updated");
    await fillEditor(page, "Updated content.");

    await page.locator("text=保存").first().click();

    await page.waitForURL("**/posts", { timeout: 10_000 });
  });

  it("deletes a post from the edit page", async () => {
    await page.goto("/posts");
    await expectVisible(page.getByRole("heading", { name: "文章管理" }), 10_000);

    await page.locator("text=Hello World").first().click();
    await page.waitForURL("**/posts/hello-world**", { timeout: 10_000 });

    await expectVisible(page.locator("text=删除文章"), 10_000);
    await page.locator("text=删除文章").first().click();

    await expectVisible(page.locator("text=确认删除"), 5_000);
    await page.locator("text=确认删除").click();

    await page.waitForURL("**/posts", { timeout: 10_000 });
  });
});

describe("Deploy", () => {
  beforeEach(async () => {
    await setupAuthenticatedApp(page);
  });

  it("loads deploy page with status", async () => {
    await page.goto("/deploy");
    await expectVisible(page.getByRole("heading", { name: "部署管理" }), 10_000);
    await expectVisible(page.locator("text=手动触发部署"), 5_000);
  });

  it("can trigger a deploy", async () => {
    await page.goto("/deploy");
    await expectVisible(page.locator("text=手动触发部署"), 10_000);

    await page.locator("text=手动触发部署").first().click();

    await expectVisible(page.locator("text=提示"), 5_000);
    await page.locator("text=确定").click();
  });
});

describe("Comments & Menus pages", () => {
  beforeEach(async () => {
    await setupAuthenticatedApp(page);
  });

  it("loads comments page", async () => {
    await page.goto("/comments");
    await expectVisible(page.locator("text=评论插件未启用"), 10_000);
  });

  it("loads menus page", async () => {
    await page.goto("/menus");
    await expectVisible(page.getByRole("heading", { name: "菜单管理" }), 10_000);
    await expectVisible(page.locator("text=添加菜单"), 5_000);
    await expectVisible(page.locator("text=保存"), 5_000);
  });
});
