export function friendlyError(
  error: { data?: { code?: string } | null } | null,
) {
  if (error?.data?.code === "NOT_FOUND")
    return "Tarefa não encontrada. Ela pode ter sido excluída.";
  if (error?.data?.code === "BAD_REQUEST")
    return "Confira os dados da tarefa e tente novamente.";
  return "Não foi possível concluir. Tente novamente; seus dados continuam aqui.";
}
