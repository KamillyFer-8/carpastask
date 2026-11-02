import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell state-page" id="conteudo">
      <h1>Tarefa não encontrada.</h1>
      <p>Ela pode ter sido excluída ou o endereço pode estar incorreto.</p>
      <Link className="primary" href="/">
        Voltar para tarefas
      </Link>
    </main>
  );
}
