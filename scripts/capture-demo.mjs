// Capture the real production UI in an isolated process with fictitious tasks.
// This does not read, reset or seed a running development/preview server.
import next from "next";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const directory = "docs/demo";
const app = next({ dev: false, hostname: "127.0.0.1", port });
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
function day(offset) {
  const value = new Date(`${today}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
let server;
let browser;
let exitCode = 0;
try {
  await mkdir(directory, { recursive: true });
  await app.prepare();
  server = createServer(app.getRequestHandler());
  server.listen(port, "127.0.0.1");
  await once(server, "listening");
  const api = createTRPCProxyClient({
    links: [httpBatchLink({ url: `${baseURL}/api/trpc` })],
  });
  const samples = [
    {
      titulo: "Review the project proposal",
      descricao: "Check the scope, deliverables and acceptance criteria.",
      dataAgendada: day(-2),
    },
    {
      titulo: "Confirm the review checklist",
      descricao: "Record the remaining points before the next review.",
      dataAgendada: day(-1),
      horario: "16:00",
    },
    {
      titulo: "Prepare the project walkthrough",
      descricao:
        "Summarize the architecture and demonstrate the task workflow.",
      dataAgendada: day(0),
      horario: "09:00",
    },
    {
      titulo: "Review keyboard accessibility",
      descricao: "Check focus indicators, form labels and the deletion dialog.",
      dataAgendada: day(1),
      horario: "14:00",
    },
    {
      titulo: "Technical discussion",
      descricao: "Walk through validation, SSR and the in-memory repository.",
      dataAgendada: day(3),
      horario: "10:30",
    },
    {
      titulo: "Outline the next iteration",
      descricao:
        "Keep a short list of improvements to consider after the assessment.",
    },
  ];
  const tasks = [];
  for (const fields of samples)
    tasks.push(await api.task.create.mutate(fields));
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(baseURL);
  await expect(page.locator(".task-card")).toHaveCount(6);
  await expect(page.locator(".reminder-group.atrasadas .count")).toHaveText(
    "2",
  );
  await expect(page.locator(".reminder-group.proximas .count")).toHaveText("3");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: `${directory}/overview.png`, fullPage: true });
  await page
    .locator(".planning-grid")
    .screenshot({ path: `${directory}/calendar-reminders.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: `${directory}/mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await page.getByLabel("Title (required)").fill("Draft release notes");
  await page
    .getByLabel("Description (optional)")
    .fill(
      "Describe the completed changes and record the verification results.",
    );
  await page.getByLabel("Task date (optional)").fill(day(4));
  await page.getByLabel("Time (optional)").fill("11:00");
  await page
    .getByRole("heading", { name: "New task", exact: true, level: 1 })
    .click();
  await page.screenshot({
    path: `${directory}/create-task.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".feedback")).toHaveText(
    "Task created successfully.",
  );
  await page
    .getByRole("link", {
      name: "Edit Prepare the project walkthrough",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tarefas/${tasks[2].id}/editar$`));
  await page
    .getByLabel("Description (optional)")
    .fill("Include a live CRUD demonstration and the production SSR check.");
  await page
    .getByRole("heading", { name: "Edit task", exact: true, level: 1 })
    .click();
  await page.screenshot({ path: `${directory}/edit-task.png`, fullPage: true });
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.locator(".feedback")).toHaveText(
    "Task updated successfully.",
  );
  await page
    .getByRole("button", { name: "Delete Draft release notes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .screenshot({ path: `${directory}/delete-task.png` });
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await expect(page.locator(".task-card")).toHaveCount(6);
  expect(errors).toEqual([]);
  console.log(
    "Demo captured: 6 fictitious tasks, 2 overdue reminders, 3 upcoming reminders; create/edit/delete verified.",
  );
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await browser?.close();
  server?.closeAllConnections();
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await app.close();
}
process.exit(exitCode);
