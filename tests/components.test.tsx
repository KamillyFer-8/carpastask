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
    await user.type(screen.getByLabelText(/Title/), "   ");
    await user.click(screen.getByRole("button", { name: "Save task" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter a task title.",
    );
    expect(submit).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Title/), "Review");
    await user.click(screen.getByRole("button", { name: "Save task" }));
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
    await user.type(screen.getByLabelText(/Title/), "Interview");
    await user.type(screen.getByLabelText(/Time/), "14:30");
    await user.click(screen.getByRole("button", { name: "Save task" }));
    expect(submit).toHaveBeenLastCalledWith({
      titulo: "Interview",
      descricao: undefined,
      dataAgendada: "2026-11-05",
      horario: "14:30",
    });
    await user.click(
      screen.getByRole("button", { name: "Remove date and time" }),
    );
    expect(screen.getByLabelText(/Time/)).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Save task" }));
    expect(submit).toHaveBeenLastCalledWith({
      titulo: "Interview",
      descricao: undefined,
      dataAgendada: undefined,
      horario: undefined,
    });
  });
  it("displays pending feedback and blocks duplicate submissions", () => {
    render(<TaskForm pending onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByLabelText(/Title/)).toBeDisabled();
  });
  it("preserves input on server errors and supports cancel", async () => {
    const cancel = vi.fn();
    const user = userEvent.setup();
    render(
      <TaskForm
        pending={false}
        error="Task not found."
        onSubmit={vi.fn()}
        onCancel={cancel}
      />,
    );
    await user.type(screen.getByLabelText(/Title/), "Keep my draft");
    expect(screen.getByRole("alert")).toHaveTextContent("Task not found.");
    expect(screen.getByLabelText(/Title/)).toHaveValue("Keep my draft");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
  });
});
