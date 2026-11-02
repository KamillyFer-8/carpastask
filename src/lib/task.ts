import { z } from "zod";
export const taskFields = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Please enter a task title.")
    .max(120, "Use 120 characters or fewer."),
  descricao: z
    .string()
    .trim()
    .max(2000, "Use 2,000 characters or fewer.")
    .optional()
    .transform((value) => value || undefined),
});
export const taskId = z.string().uuid("Invalid task ID.");
export const cursorSchema = z.object({
  dataCriacao: z.string().datetime(),
  id: taskId,
});
export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: string;
};
export type Cursor = z.infer<typeof cursorSchema>;
export type TaskPage = { items: Task[]; nextCursor: Cursor | null };
export const PAGE_SIZE = 10;
