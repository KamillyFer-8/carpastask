import "server-only";
import { randomUUID } from "node:crypto";
import type { Cursor, Task, TaskPage } from "@/lib/task";

const compare = (a: Cursor, b: Cursor) =>
  b.dataCriacao.localeCompare(a.dataCriacao) || b.id.localeCompare(a.id);
export class TaskRepository {
  private tasks = new Map<string, Task>();
  get(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }
  create(fields: Pick<Task, "titulo" | "descricao">): Task {
    const task = {
      ...fields,
      id: randomUUID(),
      dataCriacao: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return { ...task };
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
  update(
    id: string,
    fields: Pick<Task, "titulo" | "descricao">,
  ): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return;
    const updated = { ...existing, ...fields };
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
