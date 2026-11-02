"use client";
import Link from "next/link";
import { ArrowUpRight, Bell, CircleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { TaskReminders } from "@/lib/task";
import { formatDay } from "@/lib/calendar";

export function TaskReminderPanel({
  initialData,
  today,
}: {
  initialData: TaskReminders;
  today: string;
}) {
  const query = trpc.task.reminders.useQuery({ hoje: today }, { initialData });
  const data = query.data ?? initialData;
  return (
    <aside
      className="reminders-panel"
      id="lembretes"
      aria-labelledby="reminders-heading"
    >
      <div className="panel-heading">
        <span className="section-number" aria-hidden="true">
          03
        </span>
        <h2 id="reminders-heading">Lembretes</h2>
        <Bell size={17} />
      </div>
      <p className="reminder-explanation">
        Tarefas com data marcada. Consulte aqui ao abrir o sistema.
      </p>
      {query.isError ? (
        <p className="field-error" role="alert">
          Não foi possível carregar os lembretes.{" "}
          <button className="text-button" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : (
        <>
          {(["atrasadas", "proximas"] as const).map((key) => {
            const group = data[key];
            return (
              <section
                key={key}
                className={`reminder-group ${key}`}
                aria-label={
                  key === "atrasadas" ? "Tarefas atrasadas" : "Próximas tarefas"
                }
              >
                <div className="reminder-group-title">
                  <h3>
                    {key === "atrasadas" ? (
                      <>
                        <CircleAlert size={14} />
                        Atrasadas
                      </>
                    ) : (
                      "Hoje e próximos dias"
                    )}
                  </h3>
                  <span className="count">{group.total}</span>
                </div>
                {group.items.length ? (
                  <ul>
                    {group.items.map((task) => (
                      <li key={task.id}>
                        <Link href={`/tarefas/${task.id}/editar`}>
                          <span className="reminder-date">
                            {formatDay(task.dataAgendada!)}
                            {task.horario
                              ? ` / ${task.horario}`
                              : " / Dia todo"}
                          </span>
                          <strong>{task.titulo}</strong>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="reminder-empty">
                    {key === "atrasadas"
                      ? "Nenhuma tarefa atrasada."
                      : "Nenhuma tarefa para os próximos 7 dias."}
                  </p>
                )}
                {group.total > group.items.length && (
                  <a className="reminder-more" href="#tarefas">
                    Ver todas as tarefas ({group.total})
                  </a>
                )}
              </section>
            );
          })}
        </>
      )}
      <p className="reminder-footnote">
        Tarefas com data anterior a hoje aparecem como atrasadas. Este painel
        não envia notificações.
      </p>
      <span className="paper-corner" aria-hidden="true" />
    </aside>
  );
}
