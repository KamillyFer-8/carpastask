import { z } from "zod";
export const calendarDate = z.iso
  .date("Informe uma data válida.")
  .refine(
    (date) => date >= "1900-01-01" && date <= "9998-12-31",
    "Escolha uma data entre 1900 e 9998.",
  );
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  calendarDate.optional(),
);
const optionalTime = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.")
    .optional(),
);
export const taskFields = z
  .object({
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
    dataAgendada: optionalDate,
    horario: optionalTime,
  })
  .refine((task) => !task.horario || !!task.dataAgendada, {
    message: "Escolha uma data para definir o horário.",
    path: ["dataAgendada"],
  });
export type TaskFields = Pick<
  Task,
  "titulo" | "descricao" | "dataAgendada" | "horario"
>;
export const agendaRange = z
  .object({ inicio: calendarDate, fim: calendarDate })
  .refine(
    (range) =>
      range.inicio <= range.fim &&
      (Date.parse(range.fim) - Date.parse(range.inicio)) / 86400000 <= 31,
    "Escolha um intervalo de até 31 dias.",
  );
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
  dataAgendada?: string;
  horario?: string;
};
export type Cursor = z.infer<typeof cursorSchema>;
export type TaskPage = { items: Task[]; nextCursor: Cursor | null };
export const PAGE_SIZE = 10;
export type TaskReminders = {
  atrasadas: { total: number; items: Task[] };
  proximas: { total: number; items: Task[] };
};
