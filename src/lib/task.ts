import { z } from "zod";
export const taskFields = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Informe um título para a tarefa.")
    .max(120, "Use no máximo 120 caracteres."),
  descricao: z
    .string()
    .trim()
    .max(2000, "Use no máximo 2.000 caracteres.")
    .optional()
    .transform((value) => value || undefined),
});
export const taskId = z.string().uuid("Identificador de tarefa inválido.");
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
