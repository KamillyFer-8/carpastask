import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskForm } from "@/components/task-form";
describe("TaskForm", () => {
  it("validates whitespace and submits normalized values", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<TaskForm pending={false} onSubmit={submit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/Título/), "   ");
    await user.click(screen.getByRole("button", { name: "Salvar tarefa" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um título para a tarefa.",
    );
    expect(submit).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Título/), "Review");
    await user.click(screen.getByRole("button", { name: "Salvar tarefa" }));
    expect(submit).toHaveBeenCalledWith({
      titulo: "Review",
      descricao: undefined,
      dataAgendada: undefined,
      horario: undefined,
    });
  });
  it("submits a scheduled date/time and clears both together", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(
      <TaskForm
        pending={false}
        initialDate="2026-11-05"
        onSubmit={submit}
        onCancel={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Título/), "Entrevista");
    await user.type(screen.getByLabelText(/Horário/), "14:30");
    await user.click(screen.getByRole("button", { name: "Salvar tarefa" }));
    expect(submit).toHaveBeenLastCalledWith({
      titulo: "Entrevista",
      descricao: undefined,
      dataAgendada: "2026-11-05",
      horario: "14:30",
    });
    await user.click(
      screen.getByRole("button", { name: "Remover data e horário" }),
    );
    expect(screen.getByLabelText(/Horário/)).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Salvar tarefa" }));
    expect(submit).toHaveBeenLastCalledWith({
      titulo: "Entrevista",
      descricao: undefined,
      dataAgendada: undefined,
      horario: undefined,
    });
  });
  it("displays pending feedback and blocks duplicate submissions", () => {
    render(<TaskForm pending onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    expect(screen.getByLabelText(/Título/)).toBeDisabled();
  });
  it("preserves input on server errors and supports cancel", async () => {
    const cancel = vi.fn();
    const user = userEvent.setup();
    render(
      <TaskForm
        pending={false}
        error="Tarefa não encontrada."
        onSubmit={vi.fn()}
        onCancel={cancel}
      />,
    );
    await user.type(screen.getByLabelText(/Título/), "Keep my draft");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tarefa não encontrada.",
    );
    expect(screen.getByLabelText(/Título/)).toHaveValue("Keep my draft");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(cancel).toHaveBeenCalledOnce();
  });
});
