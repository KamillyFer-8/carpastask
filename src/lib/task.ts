import { z } from "zod";
export const calendarDate = z.iso
  .date("Enter a valid date.")
  .refine(
    (date) => date >= "1900-01-01" && date <= "9998-12-31",
    "Choose a date between 1900 and 9998.",
  );
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  calendarDate.optional(),
);
const optionalTime = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.")
    .optional(),
);
export const taskFields = z
  .object({
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
    dataAgendada: optionalDate,
    horario: optionalTime,
  })
  .refine((task) => !task.horario || !!task.dataAgendada, {
    message: "Choose a date before setting a time.",
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
    "Choose a date range of up to 31 days.",
  );
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
