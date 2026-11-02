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
      setFeedback("Tarefa excluída.");
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
      ? "Tarefa criada com sucesso."
      : success === "atualizada"
        ? "Tarefa atualizada com sucesso."
        : "");
  return (
    <main className="shell" id="conteudo">
      <section className="workspace-intro">
        <div className="intro-copy">
          <h1>
            Tarefas
            <br />
            <span>&amp; agenda.</span>
          </h1>
          <div className="intro-actions">
            <Link className="primary" href="/tarefas/nova">
              <Plus size={18} />
              Nova tarefa
            </Link>
            <a className="intro-calendar-link" href="#agenda">
              Ver calendário
            </a>
          </div>
        </div>
        <div className="workspace-stamp">
          <span>HOJE</span>
          <time dateTime={today}>
            {formatDay(today, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).replaceAll("/", ".")}
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
      <nav className="workspace-nav" aria-label="Seções do planejamento">
        <a href="#agenda">
          <CalendarDays size={16} />
          Calendário
        </a>
        <a href="#lembretes">
          <Bell size={16} />
          Lembretes
        </a>
        <a href="#tarefas">
          <Feather size={16} />
          Todas as tarefas
        </a>
      </nav>
      <div className="planning-grid">
        <TaskAgenda initialTasks={initialAgenda} today={today} />
        <TaskReminderPanel initialData={initialReminders} today={today} />
      </div>
      <section
        className="tasks-section"
        id="tarefas"
        aria-labelledby="tasks-heading"
      >
        <div className="list-heading">
          <div>
            <span className="section-number" aria-hidden="true">
              03
            </span>
            <h2 id="tasks-heading">
              Todas as tarefas{" "}
              <span
                className="count"
                aria-label={`${tasks.length} tarefas carregadas`}
              >
                {tasks.length}
                {list.hasNextPage ? "+" : ""}
              </span>
            </h2>
          </div>
          <span className="sort-label">
            <ArrowDown size={15} />
            Mais recentes
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
            Não foi possível carregar as tarefas.{" "}
            <button className="text-button" onClick={() => void list.refetch()}>
              Tentar novamente
            </button>
          </div>
        )}
        {tasks.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon">
              <Feather size={28} strokeWidth={1.5} />
            </div>
            <h3>Nenhuma tarefa.</h3>
            <p>Adicione um título. A data e a descrição são opcionais.</p>
            <Link className="secondary" href="/tarefas/nova">
              <Plus size={17} />
              Criar tarefa
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
                          {task.horario ? ` · ${task.horario}` : " · Dia todo"}
                        </time>
                      ) : (
                        <span>Sem data definida</span>
                      )}
                    </div>
                    <div className="task-content">
                      <h3>{task.titulo}</h3>
                      {task.descricao && <p>{task.descricao}</p>}
                      <time dateTime={task.dataCriacao}>
                        Criada em{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
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
                        aria-label={`Editar ${task.titulo}`}
                        title="Editar tarefa"
                      >
                        <Pencil size={17} />
                      </Link>
                      <button
                        className="icon-button delete-button"
                        aria-label={`Excluir ${task.titulo}`}
                        title="Excluir tarefa"
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
                  {list.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
                </button>
              ) : (
                <p>Todas as tarefas foram carregadas.</p>
              )}
              <span role="status">
                {list.isFetchingNextPage ? "Carregando mais tarefas…" : ""}
              </span>
            </div>
          </>
        )}
      </section>
      <footer>
        <span className="footer-brand">
          <AppLogo />
          CarpasTask
        </span>
        <a href="#conteudo">Voltar ao início ↑</a>
      </footer>
      {deleting && (
        <Dialog
          title="Excluir esta tarefa?"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
        >
          <div className="delete-symbol">
            <Trash2 size={24} />
          </div>
          <p className="delete-copy">
            “{deleting.titulo}” será excluída.
            <br />
            Esta ação não pode ser desfeita.
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
              Cancelar
            </button>
            <button
              className="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (!remove.isPending) remove.mutate({ id: deleting.id });
              }}
            >
              {remove.isPending ? "Excluindo…" : "Excluir tarefa"}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
