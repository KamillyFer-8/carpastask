import { test, expect } from "@playwright/test";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../src/server/api/router";
const api = () =>
  createTRPCProxyClient<AppRouter>({
    links: [httpBatchLink({ url: "http://127.0.0.1:3000/api/trpc" })],
  });
test.beforeEach(async () => {
  const client = api();
  let page = await client.task.list.query({ limit: 50 });
  while (page.items.length) {
    for (const task of page.items)
      await client.task.delete.mutate({ id: task.id });
    page = await client.task.list.query({ limit: 50 });
  }
});
test("complete CRUD, keyboard dialog, cancellation, empty state and no browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "Please enter a task title.",
  );
  await page.getByLabel("Title (required)").fill("Prepare project review");
  await page
    .getByLabel("Description (optional)")
    .fill("Review the implementation and tests.");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Prepare project review" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Prepare project review", exact: true })
    .click();
  await page.getByLabel("Title (required)").fill("Review complete");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Review complete" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Review complete", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "This action cannot be undone.",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review complete" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Review complete", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await page.getByRole("button", { name: "New task" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "New task" })).toBeFocused();
  expect(errors).toEqual([]);
});
test("production SSR contains real task markup before JavaScript", async ({
  browser,
  request,
}) => {
  const task = await api().task.create.mutate({
    titulo: "Server rendered proof",
  });
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toMatch(/<h3[^>]*>Server rendered proof<\/h3>/);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await expect(page.getByRole("heading", { name: task.titulo })).toBeVisible();
  await context.close();
});
test("loads 25 tasks incrementally without duplicates and refreshes after mutations", async ({
  page,
}) => {
  for (let i = 0; i < 25; i++)
    await api().task.create.mutate({
      titulo: `Pagination task ${String(i).padStart(2, "0")}`,
    });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(10);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator(".task-card")).toHaveCount(20);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator(".task-card")).toHaveCount(25);
  const titles = await page.locator(".task-card h3").allTextContents();
  expect(new Set(titles).size).toBe(25);
  await expect(
    page.getByText("You’re all caught up. One task at a time."),
  ).toBeVisible();
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title (required)").fill("Newest task");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".task-card").first()).toContainText("Newest task");
});
test("automatically loads on scroll and preserves a draft after a failed request", async ({
  page,
}) => {
  for (let i = 0; i < 21; i++)
    await api().task.create.mutate({ titulo: `Scroll task ${i}` });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(10);
  await page.locator(".list-end").scrollIntoViewIfNeeded();
  await expect(page.locator(".task-card")).toHaveCount(20);
  await page.locator(".list-end").scrollIntoViewIfNeeded();
  await expect(page.locator(".task-card")).toHaveCount(21);
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title (required)").fill("Preserved draft");
  await page.route("**/api/trpc/task.create*", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Title (required)")).toHaveValue(
    "Preserved draft",
  );
  await page.unroute("**/api/trpc/task.create*");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Preserved draft" }),
  ).toBeVisible();
});
test("mobile layout, long text and screenshots", async ({ page }) => {
  await api().task.create.mutate({
    titulo: "A".repeat(120),
    descricao: "Long description ".repeat(100),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "New task" }).click();
  await expect(page.getByLabel("Title (required)")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const client = api();
  for (const task of (await client.task.list.query({ limit: 50 })).items)
    await client.task.delete.mutate({ id: task.id });
  await client.task.create.mutate({
    titulo: "Make space for the week ahead",
    descricao: "Write down the essentials and choose a clear place to start.",
  });
  await client.task.create.mutate({
    titulo: "Review the project details",
    descricao:
      "Give the small things a little attention. The rest will follow.",
  });
  await client.task.create.mutate({
    titulo: "Prepare for a fresh start",
    descricao: "A short list. A calm mind. One task at a time.",
  });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "docs/desktop.png", fullPage: true });
});
