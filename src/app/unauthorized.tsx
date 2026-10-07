export default function Unauthorized() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">No autorizado</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">La sesión no es válida. Vuelve a entrar.</p>
    </main>
  );
}
