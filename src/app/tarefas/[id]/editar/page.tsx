import { notFound } from "next/navigation";
import { appRouter, createContext } from "@/server/api/router";
import { taskId } from "@/lib/task";
import { TaskEditor } from "@/components/task-editor";
import { TRPCError } from "@trpc/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "Edit task — CarpasTask" };
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!taskId.safeParse(id).success) notFound();
  try {
    const task = await appRouter.createCaller(createContext()).task.get({ id });
    return <TaskEditor key={task.id} task={task} />;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
