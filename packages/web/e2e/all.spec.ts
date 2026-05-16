import { test, expect } from "@playwright/test";
import { setupAnonymousApp, setupAuthenticatedApp } from "./helpers";

test.describe("Login", () => {
  test("renders login page", async ({ page }) => {
    await setupAnonymousApp(page);
    await page.goto("/login");
    await expect(page.locator("text=HexoCMS").first()).toBeVisible({ timeout: 15000 });
  });

  test("redirects from / to /login", async ({ page }) => {
    await setupAnonymousApp(page);
    await page.goto("/");
    await page.waitForURL("**/login");
  });

  test("redirects from /posts to /login", async ({ page }) => {
    await setupAnonymousApp(page);
    await page.goto("/posts");
    await page.waitForURL("**/login");
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page);
  });

  test("dashboard shows stats", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "数据大盘" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=文章总数").first()).toBeVisible({ timeout: 5000 });
  });

  test("posts page shows post list", async ({ page }) => {
    await page.goto("/posts");
    await expect(page.getByRole("heading", { name: "文章管理" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Hello World")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=TanStack Start Guide")).toBeVisible();
  });

  test("tags page shows tags", async ({ page }) => {
    await page.goto("/tags");
    await expect(page.getByRole("heading", { name: "标签 & 分类" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=react")).toBeVisible({ timeout: 5000 });
  });

  test("media page loads", async ({ page }) => {
    await page.goto("/media");
    await expect(page.getByRole("heading", { name: "媒体库" }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedApp(page);
  });

  test("displays settings tabs", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "站点设置" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=GitHub 集成").first()).toBeVisible();
  });

  test("can switch to GitHub tab", async ({ page }) => {
    await page.goto("/settings");
    await page.locator("text=GitHub 集成").first().click();
    await expect(page.locator('input[placeholder="owner"]')).toHaveValue("test-user", { timeout: 5000 });
  });
});
