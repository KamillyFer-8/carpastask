export function friendlyError(
  error: { data?: { code?: string } | null } | null,
) {
  if (error?.data?.code === "NOT_FOUND")
    return "Task not found. It may have been deleted.";
  if (error?.data?.code === "BAD_REQUEST")
    return "Check the task details and try again.";
  return "Could not save the task. Please try again; your draft is still here.";
}
