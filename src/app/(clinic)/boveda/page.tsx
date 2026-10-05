import { requireScreen } from "@/lib/require";

async function vaultNotes() {
  const proxy = process.env.FHIR_PROXY_URL || "http://localhost:3001";
  const res = await fetch(`${proxy}/api/vault/notes?language=es`, { cache: "no-store" });
  if (!res.ok) return { notes: [], error: await res.text() };
  return res.json();
}

export default async function BovedaPage() {
  await requireScreen("boveda");
  const data = await vaultNotes().catch((err) => ({ notes: [], error: err.message }));
  const notes = Array.isArray(data.notes) ? data.notes : Array.isArray(data) ? data : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Bóveda de contexto</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Las notas siguen en disco (`vault-es/`), no en FHIR. El listado sale del servidor Express.
      </p>
      {"error" in data && data.error ? <p className="mt-4 text-sm">{String(data.error)}</p> : null}
      <ul className="mt-8 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
        {notes.length === 0 ? <li className="px-4 py-6 text-sm text-[#6D5E52]">Sin notas.</li> : null}
        {notes.slice(0, 80).map((note: { file?: string; title?: string; path?: string }) => (
          <li key={note.file || note.path} className="px-4 py-3 text-sm">
            {note.title || note.file}
            <span className="ml-2 text-[#6D5E52]">{note.file}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
