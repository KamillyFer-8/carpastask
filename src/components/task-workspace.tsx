"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  Feather,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PAGE_SIZE, type Task, type TaskPage } from "@/lib/task";
import { AppLogo } from "./logo";
import { Dialog } from "./dialog";
import { friendlyError } from "@/lib/ui-error";
export function TaskWorkspace({
  initialPage,
  success,
}: {
  initialPage: TaskPage;
  success?: string;
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
      await utils.task.list.invalidate();
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
      <section className="intro">
        <div className="intro-copy">
          <p className="eyebrow">
            <span className="tiny-dot" />
            UM POUCO DE ORDEM, MAIS LEVEZA
          </p>
          <h1>
            Abra espaço para
            <br />
            <span>o que importa.</span>
          </h1>
          <p className="intro-description">
            Organize suas ideias e encontre seu próximo passo.
            <br className="desktop-break" /> Uma tarefa de cada vez, no seu
            ritmo.
          </p>
          <Link className="primary" href="/tarefas/nova">
            <Plus size={19} />
            Nova tarefa
            <ArrowRight className="button-arrow" size={17} />
          </Link>
        </div>
        <div className="brand-art" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="art-dot art-dot-one" />
          <span className="art-dot art-dot-two" />
          <AppLogo />
          <span className="art-caption">encontre o seu fluxo.</span>
        </div>
      </section>
      <section className="tasks-section" aria-labelledby="tasks-heading">
        <div className="list-heading">
          <div>
            <p className="eyebrow">SEU ESPAÇO DE FOCO</p>
            <h2 id="tasks-heading">
              Minhas tarefas{" "}
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
            <h3>
              Uma lista em branco.
              <br />
              Um mundo de possibilidades.
            </h3>
            <p>Adicione sua primeira tarefa e deixe o dia mais leve.</p>
            <Link className="secondary" href="/tarefas/nova">
              <Plus size={17} />
              Criar minha primeira tarefa
            </Link>
            <span className="empty-caption">
              Começar pequeno também é começar.
            </span>
          </section>
        ) : (
          <>
            <ul className="task-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <article className="task-card">
                    <span className="task-marker" aria-hidden="true" />
                    <div className="task-content">
                      <h3>{task.titulo}</h3>
                      {task.descricao && <p>{task.descricao}</p>}
                      <time dateTime={task.dataCriacao}>
                        <CalendarDays size={13} />
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
                <p>Por aqui, é tudo. Um passo de cada vez.</p>
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
          Menos ruído. Mais clareza.
        </span>
        <span>Feito para acompanhar o seu ritmo.</span>
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
