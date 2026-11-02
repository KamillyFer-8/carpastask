"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PAGE_SIZE, type Task, type TaskPage } from "@/lib/task";
import { AppLogo } from "./logo";
import { Dialog } from "./dialog";
import { TaskForm } from "./task-form";

export function TaskWorkspace({ initialPage }: { initialPage: TaskPage }) {
  const [editor, setEditor] = useState<Task | "new" | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState("");
  const [refreshError, setRefreshError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = trpc.task.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      initialData: { pages: [initialPage], pageParams: [null] },
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    },
  );
  const utils = trpc.useUtils();
  async function changed(message: string) {
    setEditor(null);
    setDeleting(null);
    setFeedback(message);
    try {
      await utils.task.list.invalidate();
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    }
  }
  const create = trpc.task.create.useMutation({
    onSuccess: () => changed("Task created successfully."),
  });
  const update = trpc.task.update.useMutation({
    onSuccess: () => changed("Task updated successfully."),
  });
  const remove = trpc.task.delete.useMutation({
    onSuccess: () => changed("Task deleted."),
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
  const pending = create.isPending || update.isPending;
  function openEditor(task: Task | "new") {
    create.reset();
    update.reset();
    setEditor(task);
  }
  return (
    <>
      <a className="skip-link" href="#tasks">
        Skip to tasks
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="CarpasTask home">
            <span className="brand-icon">
              <AppLogo />
            </span>
            CarpasTask<span className="brand-dot">.</span>
          </Link>
          <span className="header-note">
            A little space for a clearer mind.
          </span>
        </div>
      </header>
      <main className="shell" id="tasks">
        <section className="intro">
          <div>
            <p className="eyebrow">
              <span /> MAKE ROOM FOR WHAT MATTERS
            </p>
            <h1>
              Simple tasks.
              <br />
              <span>Clear focus.</span>
            </h1>
            <p className="intro-description">
              Capture what’s next. Take it one task at a time.
            </p>
          </div>
          <button
            className="primary new-task"
            onClick={() => openEditor("new")}
          >
            <Plus size={18} />
            New task
          </button>
        </section>
        <div className="list-heading">
          <h2>
            Your tasks{" "}
            <span className="count" aria-label={`${tasks.length} tasks loaded`}>
              {tasks.length}
              {list.hasNextPage ? "+" : ""}
            </span>
          </h2>
          <span className="sort-label">
            Newest first <ArrowDown size={14} />
          </span>
        </div>
        <div className="feedback" role="status" aria-live="polite">
          {feedback && (
            <>
              <Check size={16} />
              {feedback}
            </>
          )}
        </div>
        {(list.isError || refreshError) && (
          <div className="error-banner" role="alert">
            Could not load your tasks.{" "}
            <button
              className="text-button"
              onClick={() => {
                setRefreshError(false);
                void list.refetch();
              }}
            >
              Try again
            </button>
          </div>
        )}
        {tasks.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon">
              <ClipboardList size={30} strokeWidth={1.4} />
            </div>
            <h3>No tasks yet.</h3>
            <p>Create your first task to get started.</p>
            <button className="secondary" onClick={() => openEditor("new")}>
              <Plus size={16} />
              Create task
            </button>
            <span className="empty-caption">A fresh start. A clear head.</span>
          </section>
        ) : (
          <>
            <ul className="task-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <article className="task-card">
                    <div className="task-marker" aria-hidden="true" />
                    <div className="task-content">
                      <h3>{task.titulo}</h3>
                      {task.descricao && <p>{task.descricao}</p>}
                      <time dateTime={task.dataCriacao}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(task.dataCriacao))}
                      </time>
                    </div>
                    <div className="task-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${task.titulo}`}
                        onClick={() => openEditor(task)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button delete-button"
                        aria-label={`Delete ${task.titulo}`}
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
                  {list.isFetchingNextPage ? "Loading more…" : "Load more"}
                </button>
              ) : (
                <p>You’re all caught up. One task at a time.</p>
              )}
              <span role="status">
                {list.isFetchingNextPage ? "Loading more tasks…" : ""}
              </span>
            </div>
          </>
        )}
        <footer>
          <span className="footer-brand">
            <AppLogo />
            Less noise. More focus.
          </span>
          <span>
            Made for your everyday.
            <ArrowUpRight size={13} />
          </span>
        </footer>
      </main>
      {editor && (
        <Dialog
          title={editor === "new" ? "New task" : "Edit task"}
          busy={pending}
          onClose={() => setEditor(null)}
        >
          <TaskForm
            task={editor === "new" ? undefined : editor}
            pending={pending}
            error={create.error?.message || update.error?.message}
            onCancel={() => setEditor(null)}
            onSubmit={(fields) => {
              if (pending) return;
              if (editor === "new") create.mutate(fields);
              else update.mutate({ ...fields, id: editor.id });
            }}
          />
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Delete this task?"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
        >
          <p className="delete-copy">
            “{deleting.titulo}” will be deleted. This action cannot be undone.
          </p>
          {remove.error && (
            <p className="field-error" role="alert">
              {remove.error.message}
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
    </>
  );
}
