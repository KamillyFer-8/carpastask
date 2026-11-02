import { appRouter, createContext } from "@/server/api/router";
import { TaskWorkspace } from "@/components/task-workspace";
import { PAGE_SIZE } from "@/lib/task";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page() {
  const initialPage = await appRouter
    .createCaller(createContext())
    .task.list({ limit: PAGE_SIZE });
  return <TaskWorkspace initialPage={initialPage} />;
}
