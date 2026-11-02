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
        <h2 id="reminders-heading">Reminders</h2>
        <Bell size={17} />
      </div>
      <p className="reminder-explanation">
        Scheduled tasks to review when you open the app.
      </p>
      {query.isError ? (
        <p className="field-error" role="alert">
          Could not load reminders.{" "}
          <button className="text-button" onClick={() => void query.refetch()}>
            Try again
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
                  key === "atrasadas" ? "Overdue tasks" : "Upcoming tasks"
                }
              >
                <div className="reminder-group-title">
                  <h3>
                    {key === "atrasadas" ? (
                      <>
                        <CircleAlert size={14} />
                        Overdue
                      </>
                    ) : (
                      "Next 7 days"
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
                            {task.horario ? ` / ${task.horario}` : " / All day"}
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
                      ? "No overdue tasks."
                      : "No tasks scheduled for the next 7 days."}
                  </p>
                )}
                {group.total > group.items.length && (
                  <a className="reminder-more" href="#tarefas">
                    View all tasks ({group.total})
                  </a>
                )}
              </section>
            );
          })}
        </>
      )}
      <p className="reminder-footnote">
        Tasks dated before today appear as overdue. This panel does not send
        notifications.
      </p>
      <span className="paper-corner" aria-hidden="true" />
    </aside>
  );
}
