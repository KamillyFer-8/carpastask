"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Bell,
  CalendarDays,
  Check,
  Feather,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PAGE_SIZE,
  type Task,
  type TaskPage,
  type TaskReminders,
} from "@/lib/task";
import { AppLogo } from "./logo";
import { Dialog } from "./dialog";
import { friendlyError } from "@/lib/ui-error";
import { TaskAgenda } from "./task-agenda";
import { formatDay } from "@/lib/calendar";
import { TaskReminderPanel } from "./task-reminders";
export function TaskWorkspace({
  initialPage,
  success,
  initialAgenda,
  today,
  initialReminders,
}: {
  initialPage: TaskPage;
  success?: string;
  initialAgenda: Task[];
  today: string;
  initialReminders: TaskReminders;
}) {
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const list = trpc.task.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      initialData: { pages: [initialPage], pageParams: [null] },
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    },
  );
  const utils = trpc.useUtils();
  const remove = trpc.task.delete.useMutation({
    onSuccess: async () => {
      setDeleting(null);
      setFeedback("Task deleted.");
      await Promise.all([
        utils.task.list.invalidate(),
        utils.task.agenda.invalidate(),
        utils.task.reminders.invalidate(),
      ]);
    },
  });
  const { hasNextPage, isFetching, fetchNextPage } = list;
  useEffect(() => {
    if (
      !sentinel.current ||
      !hasNextPage ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) void fetchNextPage();
      },
      { rootMargin: "160px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);
  const tasks = [
    ...new Map(
      list.data.pages
        .flatMap((page) => page.items)
        .map((task) => [task.id, task]),
    ).values(),
  ];
  const notice =
    feedback ||
    (success === "criada"
      ? "Task created successfully."
      : success === "atualizada"
        ? "Task updated successfully."
        : "");
  return (
    <main className="shell" id="conteudo">
      <section className="workspace-intro">
        <div className="intro-copy">
          <h1>
            Tasks
            <br />
            <span>&amp; calendar.</span>
          </h1>
          <div className="intro-actions">
            <Link className="primary" href="/tarefas/nova">
              <Plus size={18} />
              New task
            </Link>
            <a className="intro-calendar-link" href="#agenda">
              View calendar
            </a>
          </div>
        </div>
        <div className="workspace-stamp">
          <span>TODAY</span>
          <time dateTime={today}>
            {formatDay(today, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </time>
          <svg viewBox="0 0 190 40" aria-hidden="true">
            {Array.from({ length: 38 }, (_, index) => (
              <rect
                key={index}
                x={index * 5}
                width={[2, 1, 3, 1, 4, 2][index % 6]}
                height={index % 5 === 0 ? 35 : 30}
                fill="currentColor"
              />
            ))}
          </svg>
          <span>{formatDay(today, { weekday: "long" })}</span>
        </div>
      </section>
      <nav className="workspace-nav" aria-label="Workspace sections">
        <a href="#tarefas">
          <Feather size={16} />
          All tasks
        </a>
        <a href="#agenda">
          <CalendarDays size={16} />
          Calendar
        </a>
        <a href="#lembretes">
          <Bell size={16} />
          Reminders
        </a>
      </nav>
      <section
        className="tasks-section"
        id="tarefas"
        aria-labelledby="tasks-heading"
      >
        <div className="list-heading">
          <div>
            <span className="section-number" aria-hidden="true">
              01
            </span>
            <h2 id="tasks-heading">
              All tasks{" "}
              <span
                className="count"
                aria-label={`${tasks.length} tasks loaded`}
              >
                {tasks.length}
                {list.hasNextPage ? "+" : ""}
              </span>
            </h2>
          </div>
          <span className="sort-label">
            <ArrowDown size={15} />
            Newest first
          </span>
        </div>
        <div role="status" aria-live="polite">
          {notice && (
            <p className="feedback">
              <Check size={17} />
              {notice}
            </p>
          )}
        </div>
        {list.isError && (
          <div className="error-banner" role="alert">
            Could not load tasks.{" "}
            <button className="text-button" onClick={() => void list.refetch()}>
              Try again
            </button>
          </div>
        )}
        {tasks.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon">
              <Feather size={28} strokeWidth={1.5} />
            </div>
            <h3>No tasks yet.</h3>
            <p>Add a title. The date and description are optional.</p>
            <Link className="secondary" href="/tarefas/nova">
              <Plus size={17} />
              Create task
            </Link>
          </section>
        ) : (
          <>
            <ul className="task-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <article
                    className={`task-card${task.dataAgendada ? " is-scheduled" : ""}`}
                  >
                    <div className="task-date-badge">
                      <CalendarDays size={14} />
                      {task.dataAgendada ? (
                        <time dateTime={task.dataAgendada}>
                          {formatDay(task.dataAgendada)}
                          {task.horario ? ` · ${task.horario}` : " · All day"}
                        </time>
                      ) : (
                        <span>No date set</span>
                      )}
                    </div>
                    <div className="task-content">
                      <h3>{task.titulo}</h3>
                      {task.descricao && <p>{task.descricao}</p>}
                      <time dateTime={task.dataCriacao}>
                        Created on{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(task.dataCriacao))}
                      </time>
                    </div>
                    <div className="task-actions">
                      <Link
                        className="icon-button"
                        href={`/tarefas/${task.id}/editar`}
                        aria-label={`Edit ${task.titulo}`}
                        title="Edit task"
                      >
                        <Pencil size={17} />
                      </Link>
                      <button
                        className="icon-button delete-button"
                        aria-label={`Delete ${task.titulo}`}
                        title="Delete task"
                        onClick={() => {
                          remove.reset();
                          setDeleting(task);
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            <div ref={sentinel} className="list-end">
              {list.hasNextPage ? (
                <button
                  className="secondary"
                  disabled={list.isFetching}
                  onClick={() => void list.fetchNextPage()}
                >
                  {list.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              ) : (
                <p>All tasks have been loaded.</p>
              )}
              <span role="status">
                {list.isFetchingNextPage ? "Loading more tasks…" : ""}
              </span>
            </div>
          </>
        )}
      </section>
      <div className="planning-grid">
        <TaskAgenda initialTasks={initialAgenda} today={today} />
        <TaskReminderPanel initialData={initialReminders} today={today} />
      </div>
      <footer>
        <span className="footer-brand">
          <AppLogo />
          CarpasTask
        </span>
        <a href="#conteudo">Back to top ↑</a>
      </footer>
      {deleting && (
        <Dialog
          title="Delete this task?"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
        >
          <div className="delete-symbol">
            <Trash2 size={24} />
          </div>
          <p className="delete-copy">
            “{deleting.titulo}” will be deleted.
            <br />
            This action cannot be undone.
          </p>
          {remove.error && (
            <p className="field-error" role="alert">
              {friendlyError(remove.error)}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (!remove.isPending) remove.mutate({ id: deleting.id });
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete task"}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
