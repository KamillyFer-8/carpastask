"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Task } from "@/lib/task";
import { addDays, formatDay, weekStart } from "@/lib/calendar";

export function TaskAgenda({
  initialTasks,
  today,
}: {
  initialTasks: Task[];
  today: string;
}) {
  const initialWeek = weekStart(today);
  const [inicio, setInicio] = useState(initialWeek);
  const fim = addDays(inicio, 6);
  const agenda = trpc.task.agenda.useQuery(
    { inicio, fim },
    { initialData: inicio === initialWeek ? initialTasks : undefined },
  );
  const days = Array.from({ length: 7 }, (_, index) => addDays(inicio, index));
  return (
    <section
      className="agenda-section"
      id="agenda"
      aria-labelledby="agenda-heading"
    >
      <div className="agenda-toolbar">
        <div>
          <p className="eyebrow">SEUS PRÓXIMOS COMPROMISSOS</p>
          <h2 id="agenda-heading">Agenda da semana</h2>
          <p className="section-description">
            {formatDay(inicio)} a{" "}
            {formatDay(fim, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="agenda-controls">
          <label className="date-jump">
            <CalendarDays size={16} />
            <span className="sr-only">Ir para uma data</span>
            <input
              type="date"
              aria-label="Ir para uma data"
              min="1900-01-08"
              max="9998-12-24"
              value={inicio}
              onChange={(event) => {
                if (event.target.validity.valid && event.target.value)
                  setInicio(weekStart(event.target.value));
              }}
            />
          </label>
          <div className="week-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="Semana anterior"
              disabled={inicio <= "1900-01-08"}
              onClick={() => setInicio(addDays(inicio, -7))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="today-button"
              onClick={() => setInicio(initialWeek)}
            >
              Hoje
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Próxima semana"
              disabled={inicio >= "9998-12-18"}
              onClick={() => setInicio(addDays(inicio, 7))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="agenda-announcement" role="status" aria-live="polite">
        {agenda.isFetching
          ? "Carregando a agenda…"
          : `${agenda.data?.length ?? 0} tarefas nesta semana.`}
      </div>
      {agenda.isError ? (
        <div className="error-banner" role="alert">
          Não foi possível carregar a agenda.{" "}
          <button className="text-button" onClick={() => void agenda.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="week-grid">
            {days.map((day) => {
              const tasks =
                agenda.data?.filter((task) => task.dataAgendada === day) ?? [];
              const isToday = day === today;
              return (
                <section
                  key={day}
                  className={`week-day${isToday ? " is-today" : ""}`}
                  aria-label={formatDay(day, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                >
                  <div className="day-heading">
                    <span>
                      {formatDay(day, { weekday: "short" }).replace(".", "")}
                    </span>
                    <time
                      dateTime={day}
                      aria-current={isToday ? "date" : undefined}
                    >
                      {formatDay(day, { day: "2-digit" })}
                    </time>
                    {isToday && <span className="today-label">hoje</span>}
                  </div>
                  <div className="day-tasks">
                    {tasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tarefas/${task.id}/editar`}
                        className="agenda-task"
                      >
                        <span>{task.horario || "Dia todo"}</span>
                        <strong>{task.titulo}</strong>
                        {task.descricao && <p>{task.descricao}</p>}
                      </Link>
                    ))}
                    {!tasks.length && (
                      <span className="day-empty">Sem tarefas</span>
                    )}
                  </div>
                  <Link
                    href={`/tarefas/nova?data=${day}`}
                    className="add-to-day"
                    aria-label={`Adicionar tarefa em ${formatDay(day, { day: "numeric", month: "long" })}`}
                  >
                    <Plus size={15} />
                    <span>Adicionar</span>
                  </Link>
                </section>
              );
            })}
          </div>
          {!agenda.isFetching && !agenda.data?.length && (
            <p className="agenda-empty-hint">
              Sua semana está livre. Escolha um dia para agendar uma tarefa.
            </p>
          )}
        </>
      )}
    </section>
  );
}
