import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell state-page" id="conteudo">
      <h1>Task not found.</h1>
      <p>The task may have been deleted, or the address may be incorrect.</p>
      <Link className="primary" href="/">
        Back to tasks
      </Link>
    </main>
  );
}
