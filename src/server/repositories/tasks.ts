import "server-only";
import { randomUUID } from "node:crypto";
import type { Cursor, Task, TaskPage, TaskFields } from "@/lib/task";

const compare = (a: Cursor, b: Cursor) =>
  b.dataCriacao.localeCompare(a.dataCriacao) || b.id.localeCompare(a.id);
export class TaskRepository {
  private tasks = new Map<string, Task>();
  get(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }
  create(fields: TaskFields): Task {
    const task = {
      ...fields,
      id: randomUUID(),
      dataCriacao: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return { ...task };
  }
  agenda(inicio: string, fim: string): Task[] {
    return [...this.tasks.values()]
      .filter(
        (task) =>
          task.dataAgendada &&
          task.dataAgendada >= inicio &&
          task.dataAgendada <= fim,
      )
      .sort(
        (a, b) =>
          a.dataAgendada!.localeCompare(b.dataAgendada!) ||
          (a.horario ?? "").localeCompare(b.horario ?? "") ||
          compare(a, b),
      )
      .map((task) => ({ ...task }));
  }
  list(limit: number, cursor?: Cursor | null): TaskPage {
    const candidates = [...this.tasks.values()]
      .sort(compare)
      .filter((task) => !cursor || compare(task, cursor) > 0);
    const items = candidates.slice(0, limit).map((task) => ({ ...task }));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        candidates.length > limit && last
          ? { id: last.id, dataCriacao: last.dataCriacao }
          : null,
    };
  }
  update(id: string, fields: TaskFields): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return;
    // Updates replace editable fields. JSON omits undefined keys, so assign
    // optional values explicitly to allow clearing descriptions/schedules.
    const updated = {
      ...existing,
      titulo: fields.titulo,
      descricao: fields.descricao,
      dataAgendada: fields.dataAgendada,
      horario: fields.horario,
    };
    this.tasks.set(id, updated);
    return { ...updated };
  }
  delete(id: string) {
    return this.tasks.delete(id);
  }
}

// Next bundles RSC and route handlers separately. A process-global singleton keeps
// both module graphs (and development reloads) on the same in-memory repository.
const processState = globalThis as typeof globalThis & {
  carpasTaskRepository?: TaskRepository;
};
export const taskRepository = (processState.carpasTaskRepository ??=
  new TaskRepository());
