"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Leaf, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Task } from "@/lib/task";
import { TaskForm } from "./task-form";
import { friendlyError } from "@/lib/ui-error";
export function TaskEditor({ task }: { task?: Task }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  async function saved() {
    await utils.task.list.invalidate();
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
        <p className="eyebrow">UM PASSO DE CADA VEZ</p>
        <h1>{task ? "Editar tarefa" : "Uma ideia vira um próximo passo."}</h1>
        <p>
          {task
            ? "Ajuste os detalhes e siga no seu ritmo."
            : "Tire da cabeça. Coloque aqui. Cuide disso no seu tempo."}
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
              <p>O essencial para começar.</p>
            </div>
          </div>
          <TaskForm
            task={task}
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
          <h2>Comece pelo simples.</h2>
          <p>
            Um título claro ajuda a encontrar o próximo passo. Os detalhes podem
            vir depois.
          </p>
          <span>Menos ruído. Mais clareza.</span>
        </aside>
      </div>
    </main>
  );
}
