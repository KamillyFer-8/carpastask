"use client";
import { useState, type FormEvent } from "react";
import type { Task, TaskFields } from "@/lib/task";
import { taskFields } from "@/lib/task";
export function TaskForm({
  task,
  pending,
  error,
  onSubmit,
  onCancel,
  initialDate,
}: {
  task?: Task;
  pending: boolean;
  error?: string;
  onSubmit: (fields: TaskFields) => void;
  onCancel: () => void;
  initialDate?: string;
}) {
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [dataAgendada, setDataAgendada] = useState(
    task?.dataAgendada ?? initialDate ?? "",
  );
  const [horario, setHorario] = useState(task?.horario ?? "");
  const [errors, setErrors] = useState<{
    titulo?: string[];
    descricao?: string[];
    dataAgendada?: string[];
    horario?: string[];
  }>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const result = taskFields.safeParse({
      titulo,
      descricao,
      dataAgendada,
      horario,
    });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }
  return (
    <form onSubmit={submit} noValidate>
      <p className="form-intro">
        A title is required. Description, date and time are optional.
      </p>
      <label htmlFor="title">
        Title <span className="muted">(required)</span>
      </label>
      <input
        id="title"
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={120}
        aria-required="true"
        aria-invalid={!!errors.titulo}
        aria-describedby={errors.titulo ? "title-error" : undefined}
        placeholder="E.g. review the project presentation"
        disabled={pending}
      />
      {errors.titulo && (
        <p id="title-error" className="field-error" role="alert">
          {errors.titulo[0]}
        </p>
      )}
      <label htmlFor="description">
        Description <span className="muted">(optional)</span>
      </label>
      <textarea
        id="description"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="Task details"
        disabled={pending}
        aria-invalid={!!errors.descricao}
        aria-describedby={errors.descricao ? "description-error" : undefined}
      />
      {errors.descricao && (
        <p id="description-error" className="field-error" role="alert">
          {errors.descricao[0]}
        </p>
      )}
      <div className="schedule-fields">
        <div>
          <label htmlFor="scheduled-date">
            Task date <span className="muted">(optional)</span>
          </label>
          <input
            id="scheduled-date"
            type="date"
            min="1900-01-01"
            max="9998-12-31"
            value={dataAgendada}
            onChange={(event) => {
              setDataAgendada(event.target.value);
              if (!event.target.value) setHorario("");
            }}
            disabled={pending}
            aria-describedby={
              errors.dataAgendada ? "date-error" : "schedule-hint"
            }
            aria-invalid={!!errors.dataAgendada}
          />
          {errors.dataAgendada && (
            <p id="date-error" className="field-error" role="alert">
              {errors.dataAgendada[0]}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="scheduled-time">
            Time <span className="muted">(optional)</span>
          </label>
          <input
            id="scheduled-time"
            type="time"
            value={horario}
            onChange={(event) => setHorario(event.target.value)}
            disabled={pending || !dataAgendada}
            aria-describedby={errors.horario ? "time-error" : "schedule-hint"}
            aria-invalid={!!errors.horario}
          />
          {errors.horario && (
            <p id="time-error" className="field-error" role="alert">
              {errors.horario[0]}
            </p>
          )}
        </div>
      </div>
      <p className="field-hint" id="schedule-hint">
        Dated tasks appear on the calendar. Leave time blank for an all-day
        task.
      </p>
      {dataAgendada && (
        <button
          type="button"
          className="text-button clear-date"
          disabled={pending}
          onClick={() => {
            setDataAgendada("");
            setHorario("");
          }}
        >
          Remove date and time
        </button>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="primary" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save task"}
        </button>
      </div>
    </form>
  );
}
