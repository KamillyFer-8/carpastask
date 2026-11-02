import { TaskEditor } from "@/components/task-editor";
import { calendarDate } from "@/lib/task";
export const metadata = { title: "New task — CarpasTask" };
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const { data } = await searchParams;
  const parsed = calendarDate.safeParse(data);
  return (
    <TaskEditor
      key={data}
      initialDate={parsed.success ? parsed.data : undefined}
    />
  );
}
