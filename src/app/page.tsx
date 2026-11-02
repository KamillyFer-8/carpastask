import { appRouter, createContext } from "@/server/api/router";
import { TaskWorkspace } from "@/components/task-workspace";
import { PAGE_SIZE } from "@/lib/task";
import { addDays, todayInBrazil, weekStart } from "@/lib/calendar";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string }>;
}) {
  const today = todayInBrazil();
  const inicio = weekStart(today);
  const caller = appRouter.createCaller(createContext());
  const [initialPage, initialAgenda] = await Promise.all([
    caller.task.list({ limit: PAGE_SIZE }),
    caller.task.agenda({ inicio, fim: addDays(inicio, 6) }),
  ]);
  const { sucesso } = await searchParams;
  return (
    <TaskWorkspace
      initialPage={initialPage}
      initialAgenda={initialAgenda}
      today={today}
      success={sucesso}
    />
  );
}
