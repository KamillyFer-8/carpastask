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
        Título obrigatório. Descrição, data e horário opcionais.
      </p>
      <label htmlFor="title">
        Título <span className="muted">(obrigatório)</span>
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
        placeholder="Ex.: revisar a apresentação do projeto"
        disabled={pending}
      />
      {errors.titulo && (
        <p id="title-error" className="field-error" role="alert">
          {errors.titulo[0]}
        </p>
      )}
      <label htmlFor="description">
        Descrição <span className="muted">(opcional)</span>
      </label>
      <textarea
        id="description"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="Detalhes da tarefa"
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
            Data da tarefa <span className="muted">(opcional)</span>
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
            Horário <span className="muted">(opcional)</span>
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
        Com data, a tarefa aparece na agenda. Sem horário, fica como dia todo.
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
          Remover data e horário
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
          Cancelar
        </button>
        <button className="primary" disabled={pending} type="submit">
          {pending ? "Salvando…" : "Salvar tarefa"}
        </button>
      </div>
    </form>
  );
}
