"use client";
import { useState, type FormEvent } from "react";
import type { Task } from "@/lib/task";
import { taskFields } from "@/lib/task";
export function TaskForm({
  task,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  task?: Task;
  pending: boolean;
  error?: string;
  onSubmit: (fields: { titulo: string; descricao?: string }) => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [errors, setErrors] = useState<{
    titulo?: string[];
    descricao?: string[];
  }>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const result = taskFields.safeParse({ titulo, descricao });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }
  return (
    <form onSubmit={submit} noValidate>
      <p className="form-intro">Dê um nome claro ao que você quer fazer.</p>
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
        placeholder="Inclua os detalhes que ajudam a dar o próximo passo…"
        disabled={pending}
        aria-invalid={!!errors.descricao}
        aria-describedby={errors.descricao ? "description-error" : undefined}
      />
      {errors.descricao && (
        <p id="description-error" className="field-error" role="alert">
          {errors.descricao[0]}
        </p>
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
