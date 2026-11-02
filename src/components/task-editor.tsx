"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Leaf, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Task } from "@/lib/task";
import { TaskForm } from "./task-form";
import { friendlyError } from "@/lib/ui-error";
export function TaskEditor({
  task,
  initialDate,
}: {
  task?: Task;
  initialDate?: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  async function saved() {
    await Promise.all([
      utils.task.list.invalidate(),
      utils.task.agenda.invalidate(),
      utils.task.reminders.invalidate(),
    ]);
    router.push(`/?sucesso=${task ? "atualizada" : "criada"}`);
    router.refresh();
  }
  const create = trpc.task.create.useMutation({ onSuccess: saved });
  const update = trpc.task.update.useMutation({ onSuccess: saved });
  const pending = create.isPending || update.isPending;
  return (
    <main className="shell editor-shell" id="conteudo">
      {pending ? (
        <span className="back-link" aria-disabled="true">
          <ArrowLeft size={17} />
          Back to tasks
        </span>
      ) : (
        <Link href="/" className="back-link">
          <ArrowLeft size={17} />
          Back to tasks
        </Link>
      )}
      <div className="editor-heading">
        <h1>{task ? "Edit task" : "New task"}</h1>
        <p>
          {task
            ? "Update the task details or choose a different date."
            : "Add the task details and an optional date for the calendar."}
        </p>
      </div>
      <div className="editor-grid">
        <section
          className="form-card"
          aria-label={task ? "Edit task" : "New task"}
        >
          <div className="form-card-heading">
            <span className="section-icon">
              <Save size={19} />
            </span>
            <div>
              <h2>{task ? "Task details" : "New task"}</h2>
              <p>Title, description and schedule.</p>
            </div>
          </div>
          <TaskForm
            task={task}
            initialDate={initialDate}
            pending={pending}
            error={
              create.error || update.error
                ? friendlyError(create.error || update.error)
                : undefined
            }
            onCancel={() => router.push("/")}
            onSubmit={(fields) => {
              if (pending) return;
              if (task) update.mutate({ id: task.id, ...fields });
              else create.mutate(fields);
            }}
          />
        </section>
        <aside className="editor-tip">
          <Leaf size={22} />
          <h2>Date and time</h2>
          <p>
            Choose a date for interviews, meetings or deadlines. Time is
            optional; tasks without a time appear as “All day”.
          </p>
          <span>Date and time are optional.</span>
        </aside>
      </div>
    </main>
  );
}
