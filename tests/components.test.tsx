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
