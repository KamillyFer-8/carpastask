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
          Voltar para tarefas
        </span>
      ) : (
        <Link href="/" className="back-link">
          <ArrowLeft size={17} />
          Voltar para tarefas
        </Link>
      )}
      <div className="editor-heading">
        <h1>{task ? "Editar tarefa" : "Nova tarefa"}</h1>
        <p>
          {task
            ? "Atualize os detalhes ou escolha uma nova data."
            : "Adicione os detalhes e, se quiser, reserve uma data na agenda."}
        </p>
      </div>
      <div className="editor-grid">
        <section
          className="form-card"
          aria-label={task ? "Editar tarefa" : "Nova tarefa"}
        >
          <div className="form-card-heading">
            <span className="section-icon">
              <Save size={19} />
            </span>
            <div>
              <h2>{task ? "Detalhes da tarefa" : "Nova tarefa"}</h2>
              <p>Título, descrição e agendamento.</p>
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
          <h2>Data e horário</h2>
          <p>
            Use a data para entrevistas, reuniões ou entregas. O horário é
            opcional; sem ele, a tarefa aparece como “Dia todo”.
          </p>
          <span>Os campos de data e horário são opcionais.</span>
        </aside>
      </div>
    </main>
  );
}
