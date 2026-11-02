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
  it('reads a task for the dedicated edit page and rejects missing IDs', async () => {
    const task = await caller.task.create({titulo: 'Editar pela URL'});
    expect(await caller.task.get({id: task.id})).toEqual(task);
    await expect(caller.task.get({id: randomUUID()})).rejects.toMatchObject({code: 'NOT_FOUND'});
    await expect(caller.task.get({id: 'invalid'})).rejects.toMatchObject({code: 'BAD_REQUEST'});
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
      message: "Tarefa não encontrada.",
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
