import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { appRouter } from "@/server/api/router";
import { TaskRepository } from "@/server/repositories/tasks";
describe("task router and isolated repository", () => {
  let repository: TaskRepository;
  let caller: ReturnType<typeof appRouter.createCaller>;
  beforeEach(() => {
    repository = new TaskRepository();
    caller = appRouter.createCaller({ repository });
  });
  afterEach(() => vi.useRealTimers());
  it("builds reminders from the complete store, caps previews and updates after date changes", async () => {
    const overdue = await caller.task.create({
      titulo: "Review proposal",
      dataAgendada: "2026-11-01",
    });
    const upcoming = await caller.task.create({
      titulo: "Send document",
      dataAgendada: "2026-11-03",
    });
    for (let index = 0; index < 24; index++)
      await caller.task.create({
        titulo: `Upcoming ${index}`,
        dataAgendada: "2026-11-04",
      });
    await caller.task.create({
      titulo: "Outside the window",
      dataAgendada: "2026-11-09",
    });
    await caller.task.create({ titulo: "Unscheduled" });
    const reminders = await caller.task.reminders({ hoje: "2026-11-02" });
    expect(reminders.atrasadas).toMatchObject({ total: 1, items: [overdue] });
    expect(reminders.proximas.total).toBe(25);
    expect(reminders.proximas.items).toHaveLength(3);
    expect(reminders.proximas.items[0].id).toBe(upcoming.id);
    reminders.proximas.items[0].titulo = "External";
    expect((await caller.task.get({ id: upcoming.id })).titulo).toBe(
      "Send document",
    );
    await caller.task.update({ id: upcoming.id, titulo: upcoming.titulo });
    await caller.task.delete({ id: overdue.id });
    const refreshed = await caller.task.reminders({ hoje: "2026-11-02" });
    expect(refreshed.atrasadas.total).toBe(0);
    expect(refreshed.proximas.total).toBe(24);
    await expect(
      caller.task.reminders({ hoje: "invalid" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("creates, reschedules and clears a date without altering creation metadata", async () => {
    const task = await caller.task.create({
      titulo: "Interview",
      dataAgendada: "2026-11-05",
      horario: "14:30",
    });
    expect(task).toMatchObject({
      dataAgendada: "2026-11-05",
      horario: "14:30",
    });
    const moved = await caller.task.update({
      id: task.id,
      titulo: task.titulo,
      dataAgendada: "2026-11-12",
      horario: "09:00",
    });
    expect(moved.dataCriacao).toBe(task.dataCriacao);
    expect(
      await caller.task.agenda({ inicio: "2026-11-02", fim: "2026-11-08" }),
    ).toEqual([]);
    expect(
      await caller.task.agenda({ inicio: "2026-11-09", fim: "2026-11-15" }),
    ).toEqual([moved]);
    const cleared = await caller.task.update({
      id: task.id,
      titulo: task.titulo,
      dataAgendada: "",
      horario: "",
    });
    expect(cleared.dataAgendada).toBeUndefined();
    expect(cleared.horario).toBeUndefined();
    await caller.task.update({
      id: task.id,
      titulo: task.titulo,
      dataAgendada: "2026-11-12",
      horario: "09:00",
    });
    const omitted = await caller.task.update({
      id: task.id,
      titulo: task.titulo,
    });
    expect(omitted.dataAgendada).toBeUndefined();
    expect(omitted.horario).toBeUndefined();
  });
  it("validates real calendar dates, times, date dependencies and bounded ranges", async () => {
    for (const fields of [
      { dataAgendada: "2026-02-30" },
      { dataAgendada: "2026-11-05", horario: "25:00" },
      { horario: "14:00" },
      { dataAgendada: "1899-12-31" },
    ]) {
      await expect(
        caller.task.create({ titulo: "Invalid", ...fields }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    await expect(
      caller.task.agenda({ inicio: "2026-11-08", fim: "2026-11-01" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.task.agenda({ inicio: "2026-01-01", fim: "2026-11-01" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("loads the complete weekly agenda independently of list pagination", async () => {
    for (let index = 0; index < 25; index++)
      await caller.task.create({
        titulo: `Task ${index}`,
        dataAgendada: "2026-11-05",
        horario: index % 2 ? "14:00" : undefined,
      });
    await caller.task.create({
      titulo: "Outside the week",
      dataAgendada: "2026-11-12",
    });
    await caller.task.create({ titulo: "Unscheduled" });
    const result = await caller.task.agenda({
      inicio: "2026-11-02",
      fim: "2026-11-08",
    });
    expect(result).toHaveLength(25);
    expect(result[0].horario).toBeUndefined();
    expect(result.at(-1)?.horario).toBe("14:00");
    result[0].titulo = "External mutation";
    expect((await caller.task.get({ id: result[0].id })).titulo).not.toBe(
      "External mutation",
    );
  });
  it("reads a task for the dedicated edit page and rejects missing IDs", async () => {
    const task = await caller.task.create({ titulo: "Edit by URL" });
    expect(await caller.task.get({ id: task.id })).toEqual(task);
    await expect(caller.task.get({ id: randomUUID() })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(caller.task.get({ id: "invalid" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  it("creates normalized tasks with server IDs and dates", async () => {
    const task = await caller.task.create({
      titulo: "  Plan review  ",
      descricao: "  ",
    });
    expect(task).toMatchObject({ titulo: "Plan review", descricao: undefined });
    expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(task.dataCriacao)).not.toBeNaN();
    expect((await caller.task.list()).items).toEqual([task]);
  });
  it.each(["", "   ", "a".repeat(121)])(
    "rejects invalid title %j",
    async (titulo) => {
      await expect(caller.task.create({ titulo })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    },
  );
  it("rejects invalid IDs and overlong descriptions", async () => {
    await expect(caller.task.delete({ id: "invalid" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      caller.task.create({ titulo: "Task", descricao: "x".repeat(2001) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("updates fields and preserves creation metadata", async () => {
    const task = await caller.task.create({
      titulo: "Before",
      descricao: "Remove me",
    });
    expect(
      await caller.task.update({ id: task.id, titulo: "After", descricao: "" }),
    ).toEqual({ ...task, titulo: "After", descricao: undefined });
  });
  it("deletes tasks and returns meaningful errors for missing records", async () => {
    const task = await caller.task.create({ titulo: "Delete me" });
    expect(await caller.task.delete({ id: task.id })).toEqual({
      success: true,
    });
    expect((await caller.task.list()).items).toHaveLength(0);
    await expect(
      caller.task.update({ id: randomUUID(), titulo: "Missing" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Task not found.",
    });
    await expect(caller.task.delete({ id: task.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("uses deterministic tie ordering and a cursor surviving deletion and insertion", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 25; i++)
      await caller.task.create({ titulo: `Task ${i}` });
    const all = (await caller.task.list({ limit: 50 })).items;
    expect(all.map((t) => t.id)).toEqual(
      all
        .map((t) => t.id)
        .sort()
        .reverse(),
    );
    const first = await caller.task.list({ limit: 10 });
    await caller.task.delete({ id: first.nextCursor!.id });
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    await caller.task.create({ titulo: "Newer task" });
    const second = await caller.task.list({
      limit: 10,
      cursor: first.nextCursor,
    });
    const third = await caller.task.list({
      limit: 10,
      cursor: second.nextCursor,
    });
    expect([...first.items, ...second.items, ...third.items]).toEqual(all);
    expect(third.nextCursor).toBeNull();
  });
  it("isolates state and returns copies", async () => {
    expect((await caller.task.list()).items).toEqual([]);
    const task = repository.create({ titulo: "Original" });
    task.titulo = "Changed externally";
    expect(repository.list(10).items[0].titulo).toBe("Original");
    expect(new TaskRepository().list(10).items).toEqual([]);
  });
});
