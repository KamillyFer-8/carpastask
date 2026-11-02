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
  await expect(
    page.getByText("Sua primeira tarefa começa aqui."),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.getByRole("link", { name: "Nova tarefa", exact: true }).click();
  await expect(page).toHaveURL(/\/tarefas\/nova$/);
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.locator("#title-error")).toHaveText(
    "Informe um título para a tarefa.",
  );
  await page.getByLabel("Título (obrigatório)").fill("Revisar apresentação");
  await page
    .getByLabel("Descrição (opcional)")
    .fill("Conferir os detalhes antes de apresentar.");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(
    page.getByRole("heading", { name: "Revisar apresentação" }),
  ).toBeVisible();
  await expect(page.locator(".feedback")).toContainText(
    "Tarefa criada com sucesso.",
  );
  await page
    .getByRole("link", { name: "Editar Revisar apresentação", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tarefas\/.+\/editar$/);
  await page.reload();
  await expect(page.getByLabel("Título (obrigatório)")).toHaveValue(
    "Revisar apresentação",
  );
  await page.getByLabel("Título (obrigatório)").fill("Apresentação revisada");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(
    page.getByRole("heading", { name: "Apresentação revisada" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir Apresentação revisada", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Esta ação não pode ser desfeita.",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Excluir Apresentação revisada",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Excluir Apresentação revisada", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Apresentação revisada" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir Apresentação revisada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir tarefa", exact: true })
    .click();
  await expect(
    page.getByText("Sua primeira tarefa começa aqui."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Nova tarefa", exact: true }).click();
  await page.getByLabel("Título (obrigatório)").fill("Não salvar");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(
    page.getByText("Sua primeira tarefa começa aqui."),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("production SSR contains task headings before JavaScript", async ({
  browser,
  request,
}) => {
  const task = await api().task.create.mutate({
    titulo: "Conteúdo vindo do servidor",
    dataAgendada: todayInBrazil(),
    horario: "14:30",
  });
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toMatch(
    /<h3[^>]*>Conteúdo vindo do servidor<\/h3>/,
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await expect(page.getByRole("heading", { name: task.titulo })).toBeVisible();
  await expect(page.locator(".agenda-task")).toContainText(task.titulo);
  await page.goto(`http://127.0.0.1:3000/tarefas/${task.id}/editar`);
  await expect(page.getByLabel("Título (obrigatório)")).toHaveValue(
    task.titulo,
  );
  await context.close();
});
test("loads 25 tasks incrementally without duplicates and refreshes after creation", async ({
  page,
}) => {
  for (let i = 0; i < 25; i++)
    await api().task.create.mutate({ titulo: `Tarefa de paginação ${i}` });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(10);
  await page.getByRole("button", { name: "Carregar mais" }).click();
  await expect(page.locator(".task-card")).toHaveCount(20);
  await page.getByRole("button", { name: "Carregar mais" }).click();
  await expect(page.locator(".task-card")).toHaveCount(25);
  const titles = await page.locator(".task-card h3").allTextContents();
  expect(new Set(titles).size).toBe(25);
  await page.getByRole("link", { name: "Nova tarefa", exact: true }).click();
  await page.getByLabel("Título (obrigatório)").fill("Mais recente");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.locator(".task-card").first()).toContainText(
    "Mais recente",
  );
});
test("automatic scrolling and failed submission preserve the draft", async ({
  page,
}) => {
  for (let i = 0; i < 21; i++)
    await api().task.create.mutate({ titulo: `Tarefa de rolagem ${i}` });
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(10);
  await page.locator(".list-end").scrollIntoViewIfNeeded();
  await expect(page.locator(".task-card")).toHaveCount(20);
  await page.locator(".list-end").scrollIntoViewIfNeeded();
  await expect(page.locator(".task-card")).toHaveCount(21);
  await page.getByRole("link", { name: "Nova tarefa", exact: true }).click();
  await page.getByLabel("Título (obrigatório)").fill("Rascunho preservado");
  await page.route("**/api/trpc/task.create*", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.locator('.form-card [role="alert"]')).toContainText(
    "Não foi possível concluir.",
  );
  await expect(page.getByLabel("Título (obrigatório)")).toHaveValue(
    "Rascunho preservado",
  );
  await page.unroute("**/api/trpc/task.create*");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(
    page.getByRole("heading", { name: "Rascunho preservado" }),
  ).toBeVisible();
});
test("missing or invalid edit addresses show a useful not-found page", async ({
  page,
}) => {
  for (const id of ["invalido", "00000000-0000-4000-8000-000000000000"]) {
    await page.goto(`/tarefas/${id}/editar`);
    await expect(
      page.getByRole("heading", { name: "Tarefa não encontrada." }),
    ).toBeVisible();
  }
});
test("responsive layouts, local rounded font and actual screenshots", async ({
  page,
}) => {
  const long = await api().task.create.mutate({
    titulo: "A".repeat(120),
    descricao: "Descrição longa ".repeat(100),
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
    titulo: "Entrevista com a Artefact",
    descricao: "Apresentar o projeto e conversar sobre as decisões técnicas.",
    dataAgendada: addDays(weekStart(todayInBrazil()), 3),
    horario: "14:30",
  });
  await api().task.create.mutate({
    titulo: "Revisar os detalhes do projeto",
    descricao: "Conferir o que foi feito e anotar os próximos passos.",
    dataAgendada: addDays(weekStart(todayInBrazil()), 1),
  });
  await api().task.create.mutate({
    titulo: "Preparar a apresentação",
    descricao: "Organizar as ideias para compartilhar com clareza.",
    dataAgendada: weekStart(todayInBrazil()),
    horario: "09:00",
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
  await page
    .getByLabel("Título (obrigatório)")
    .fill("Entrevista com a Artefact");
  await page
    .getByLabel("Descrição (opcional)")
    .fill("Apresentar o projeto e conversar sobre as decisões técnicas.");
  await page.getByLabel("Horário (opcional)").fill("14:30");
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
      name: `Adicionar tarefa em ${formatDay(date, { day: "numeric", month: "long" })}`,
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Data da tarefa (opcional)")).toHaveValue(date);
  await page.getByLabel("Título (obrigatório)").fill("Entrevista marcada");
  await page.getByLabel("Horário (opcional)").fill("14:30");
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.locator(".agenda-task")).toContainText(
    "Entrevista marcada",
  );
  await expect(page.locator(".agenda-task")).toContainText("14:30");
  await page
    .getByRole("link", { name: "Editar Entrevista marcada", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tarefas\/.+\/editar$/);
  await page.reload();
  await expect(page.getByLabel("Data da tarefa (opcional)")).toHaveValue(date);
  await page.getByLabel("Data da tarefa (opcional)").fill(nextDate);
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
  await page.getByRole("button", { name: "Próxima semana" }).click();
  await expect(page.locator(".agenda-task")).toContainText(
    "Entrevista marcada",
  );
  await page.getByRole("button", { name: "Hoje", exact: true }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
  await page.getByLabel("Ir para uma data").fill(nextDate);
  await expect(page.locator(".agenda-task")).toContainText(
    "Entrevista marcada",
  );
  await page
    .getByRole("link", { name: "Editar Entrevista marcada", exact: true })
    .click();
  await page.getByRole("button", { name: "Remover data e horário" }).click();
  await page.getByRole("button", { name: "Salvar tarefa" }).click();
  await expect(
    page.getByRole("heading", { name: "Entrevista marcada" }),
  ).toBeVisible();
  await expect(page.locator(".task-date-badge")).toContainText(
    "Sem data definida",
  );
  await page.getByRole("button", { name: "Próxima semana" }).click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
  const scheduled = await api().task.create.mutate({
    titulo: "Agendamento para excluir",
    dataAgendada: todayInBrazil(),
  });
  await page.reload();
  await expect(page.locator(".agenda-task")).toContainText(scheduled.titulo);
  await page
    .getByRole("button", { name: `Excluir ${scheduled.titulo}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir tarefa", exact: true })
    .click();
  await expect(page.locator(".agenda-task")).toHaveCount(0);
});
