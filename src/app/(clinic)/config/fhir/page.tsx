import { proxyFetch } from "@/lib/proxy";

async function health() {
  const res = await proxyFetch("/api/health");
  if (!res.ok) return { status: "unreachable", mode: "local", message: "Proxy no disponible" };
  return res.json();
}

export default async function FhirPage() {
  const info = await health().catch(() => ({
    status: "unreachable",
    mode: "local",
    message: "Proxy no disponible",
  }));
  return (
    <div>
      <h2 className="font-serif text-2xl">Conexión FHIR</h2>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Estado: {info.status} · modo {info.mode || "—"} · pacientes {info.patientCount ?? "—"}
      </p>
      {info.serverUrl ? <p className="mt-2 text-sm text-[#6D5E52]">Servidor: {info.serverUrl}</p> : null}
      {info.message ? <p className="mt-2 text-sm text-[#6D5E52]">{info.message}</p> : null}
      <p className="mt-6 max-w-lg text-sm text-[#6D5E52]">
        El modo, la URL y el token se leen solo del entorno del servidor (FHIR_MODE, FHIR_BASE_URL,
        FHIR_AUTH_TOKEN). Esta pantalla ya no los cambia en caliente.
      </p>
    </div>
  );
}
