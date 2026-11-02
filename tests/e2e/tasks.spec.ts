import { test, expect } from "@playwright/test";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../src/server/api/router";
import {
  addDays,
  formatDay,
  todayInBrazil,
  weekStart,
} from "../../src/lib/calendar";
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
test("CRUD through dedicated pages, validation, cancellation and deletion dialog", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.locator("body")).not.toContainText(
    "SEU PLANEJAMENTO, EM UM SÓ LUGAR",
  );
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await expect(page).toHaveURL(/\/tarefas\/nova$/);
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator("#title-error")).toHaveText(
    "Please enter a task title.",
  );
  await page.getByLabel("Title (required)").fill("Review presentation");
  await page
    .getByLabel("Description (optional)")
    .fill("Check the details before presenting.");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Review presentation" }),
  ).toBeVisible();
  await expect(page.locator(".feedback")).toContainText(
    "Task created successfully.",
  );
  await page
    .getByRole("link", { name: "Edit Review presentation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tarefas\/.+\/editar$/);
  await page.reload();
  await expect(page.getByLabel("Title (required)")).toHaveValue(
    "Review presentation",
  );
  await page.getByLabel("Title (required)").fill("Presentation reviewed");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Presentation reviewed" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Presentation reviewed", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "This action cannot be undone.",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Delete Presentation reviewed",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Delete Presentation reviewed", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Presentation reviewed" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Presentation reviewed", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await page.getByLabel("Title (required)").fill("Do not save");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  expect(errors).toEqual([]);
});
test("production SSR contains task headings before JavaScript", async ({
  browser,
  request,
}) => {
  const task = await api().task.create.mutate({
    titulo: "Server-rendered content",
    dataAgendada: todayInBrazil(),
    horario: "14:30",
  });
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toMatch(
    /<h3[^>]*>Server-rendered content<\/h3>/,
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await expect(page.getByRole("heading", { name: task.titulo })).toBeVisible();
  await expect(page.locator(".agenda-task")).toContainText(task.titulo);
  await expect(page.locator(".reminder-group.proximas")).toContainText(
    task.titulo,
  );
  await page.goto(`http://127.0.0.1:3000/tarefas/${task.id}/editar`);
  await expect(page.getByLabel("Title (required)")).toHaveValue(task.titulo);
  await context.close();
});
test("loads 25 tasks incrementally without duplicates and refreshes after creation", async ({
  page,
}) => {
  // Exercise the manual fallback without automatic loading racing the clicks.
  // A separate scenario verifies the real IntersectionObserver behavior.
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
  for (let i = 0; i < 25; i++)
    await api().task.create.mutate({ titulo: `Pagination task ${i}` });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(10);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator(".task-card")).toHaveCount(20);
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(page.locator(".task-card")).toHaveCount(25);
  const titles = await page.locator(".task-card h3").allTextContents();
  expect(new Set(titles).size).toBe(25);
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await page.getByLabel("Title (required)").fill("Newest task");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".task-card").first()).toContainText("Newest task");
});
test("automatic scrolling and failed submission preserve the draft", async ({
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
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await page.getByLabel("Title (required)").fill("Preserved draft");
  await page.route("**/api/trpc/task.create*", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator('.form-card [role="alert"]')).toContainText(
    "Could not save the task.",
  );
  await expect(page.getByLabel("Title (required)")).toHaveValue(
    "Preserved draft",
  );
  await page.unroute("**/api/trpc/task.create*");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Preserved draft" }),
  ).toBeVisible();
});
test("missing or invalid edit addresses show a useful not-found page", async ({
  page,
}) => {
  for (const id of ["invalido", "00000000-0000-4000-8000-000000000000"]) {
    await page.goto(`/tarefas/${id}/editar`);
    await expect(
      page.getByRole("heading", { name: "Task not found." }),
    ).toBeVisible();
  }
});
test("responsive layouts, local rounded font and actual screenshots", async ({
  page,
}) => {
  const long = await api().task.create.mutate({
    titulo: "A".repeat(120),
    descricao: "Long description ".repeat(100),
    dataAgendada: todayInBrazil(),
    horario: "09:00",
  });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.goto(`/tarefas/${long.id}/editar`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await api().task.delete.mutate({ id: long.id });
  await page.goto("/");
  await page.screenshot({ path: "docs/empty.png", fullPage: true });
  await api().task.create.mutate({
    titulo: "Project walkthrough",
    descricao:
      "Walk through the implementation and explain the technical decisions.",
    dataAgendada: addDays(weekStart(todayInBrazil()), 3),
    horario: "14:30",
  });
  await api().task.create.mutate({
    titulo: "Review project details",
    descricao: "Review completed work and record the next steps.",
    dataAgendada: addDays(weekStart(todayInBrazil()), 1),
  });
  await api().task.create.mutate({
    titulo: "Prepare the presentation",
    descricao: "Organize the key points for the project walkthrough.",
    dataAgendada: weekStart(todayInBrazil()),
    horario: "09:00",
  });
  await api().task.create.mutate({
    titulo: "Review proposal",
    descricao: "Check the document before sending it.",
    dataAgendada: addDays(todayInBrazil(), -1),
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      document.fonts.check('600 16px "Nunito Variable"'),
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "docs/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/mobile.png", fullPage: true });
  await page.goto(
    `/tarefas/nova?data=${addDays(weekStart(todayInBrazil()), 3)}`,
  );
  await page.getByLabel("Title (required)").fill("Project walkthrough");
  await page
    .getByLabel("Description (optional)")
    .fill(
      "Walk through the implementation and explain the technical decisions.",
    );
  await page.getByLabel("Time (optional)").fill("14:30");
  await page.screenshot({ path: "docs/mobile-form.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "docs/form.png", fullPage: true });
});
test("schedules from the calendar, navigates weeks, reschedules and clears dates", async ({
  page,
}) => {
  const date = addDays(weekStart(todayInBrazil()), 3);
  const nextDate = addDays(date, 7);
  await page.goto("/");
  await page
    .getByRole("link", {
      name: `Add task on ${formatDay(date, { day: "numeric", month: "long" })}`,
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Task date (optional)")).toHaveValue(date);
  await page.getByLabel("Title (required)").fill("Scheduled interview");
  await page.getByLabel("Time (optional)").fill("14:30");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".agenda-task")).toContainText(
    "Scheduled interview",
  );
  await expect(page.locator(".agenda-task")).toContainText("14:30");
  await page
    .getByRole("link", { name: "Edit Scheduled interview", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tarefas\/.+\/editar$/);
  await page.reload();
  await expect(page.getByLabel("Task date (optional)")).toHaveValue(date);
  await page.getByLabel("Task date (optional)").fill(nextDate);
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(page.locator(".agenda-task")).toContainText(
    "Scheduled interview",
  );
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
  await page.getByLabel("Jump to a date").fill(nextDate);
  await expect(page.locator(".agenda-task")).toContainText(
    "Scheduled interview",
  );
  await page
    .getByRole("link", { name: "Edit Scheduled interview", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove date and time" }).click();
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(
    page.getByRole("heading", { name: "Scheduled interview" }),
  ).toBeVisible();
  await expect(page.locator(".task-date-badge")).toContainText("No date set");
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
  const scheduled = await api().task.create.mutate({
    titulo: "Scheduled task to delete",
    dataAgendada: todayInBrazil(),
  });
  await page.reload();
  await expect(page.locator(".agenda-task")).toContainText(scheduled.titulo);
  await page
    .getByRole("button", { name: `Delete ${scheduled.titulo}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
});
test("reminders show scheduled tasks beyond the first card page and refresh after edits", async ({
  page,
}) => {
  await api().task.create.mutate({
    titulo: "Review proposal",
    dataAgendada: addDays(todayInBrazil(), -1),
  });
  await api().task.create.mutate({
    titulo: "Send document",
    dataAgendada: addDays(todayInBrazil(), 1),
    horario: "10:00",
  });
  for (let index = 0; index < 12; index++)
    await api().task.create.mutate({ titulo: `Note ${index}` });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(10);
  await expect(
    page.locator(".task-card").filter({ hasText: "Send document" }),
  ).toHaveCount(0);
  await expect(page.locator(".reminder-group.atrasadas")).toContainText(
    "Review proposal",
  );
  await expect(page.locator(".reminder-group.proximas")).toContainText(
    "Send document",
  );
  await page
    .locator(".reminder-group.proximas")
    .getByRole("link", { name: /Send document/ })
    .click();
  await expect(page).toHaveURL(/\/tarefas\/.+\/editar$/);
  await page.getByRole("button", { name: "Remove date and time" }).click();
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".reminder-group.proximas")).toContainText(
    "No tasks scheduled for the next 7 days.",
  );
});
