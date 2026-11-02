import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { cursorSchema, PAGE_SIZE, taskFields, taskId } from "@/lib/task";
import {
  taskRepository,
  type TaskRepository,
} from "@/server/repositories/tasks";
const t = initTRPC.context<{ repository: TaskRepository }>().create({
  errorFormatter({ shape, error }) {
    if (error.code === "INTERNAL_SERVER_ERROR")
      return {
        ...shape,
        message: "Algo deu errado. Please try again.",
        data: { ...shape.data, stack: undefined },
      };
    return { ...shape, data: { ...shape.data, stack: undefined } };
  },
});
export const appRouter = t.router({
  task: t.router({
    get: t.procedure.input(z.object({ id: taskId })).query(({ ctx, input }) => {
      const task = ctx.repository.get(input.id);
      if (!task)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tarefa não encontrada.",
        });
      return task;
    }),
    create: t.procedure
      .input(taskFields)
      .mutation(({ ctx, input }) => ctx.repository.create(input)),
    list: t.procedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(50).default(PAGE_SIZE),
            cursor: cursorSchema.nullish(),
          })
          .default({ limit: PAGE_SIZE }),
      )
      .query(({ ctx, input }) =>
        ctx.repository.list(input.limit, input.cursor),
      ),
    update: t.procedure
      .input(taskFields.extend({ id: taskId }))
      .mutation(({ ctx, input }) => {
        const task = ctx.repository.update(input.id, {
          titulo: input.titulo,
          descricao: input.descricao,
        });
        if (!task)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada.",
          });
        return task;
      }),
    delete: t.procedure
      .input(z.object({ id: taskId }))
      .mutation(({ ctx, input }) => {
        if (!ctx.repository.delete(input.id))
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada.",
          });
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
export const createContext = () => ({ repository: taskRepository });
