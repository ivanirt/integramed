import Link from "next/link";
import { fhirSearch, displayName } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";
import { StartConsultButton } from "@/components/StartConsultButton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  await requireScreen("home");
  const { aviso } = await searchParams;
  const [patients, appointments, encounters] = await Promise.all([
    fhirSearch("Patient"),
    fhirSearch("Appointment"),
    fhirSearch("Encounter"),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = appointments.filter((a) => String(a.start || "").startsWith(today));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Inicio</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">El día clínico parte de la agenda y la ficha del paciente. FHIR es el almacén.</p>
      {aviso ? <p className="mt-4 border border-[#EADBCE] bg-white px-4 py-3 text-sm">{aviso}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border border-[#EADBCE] bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Pacientes</p>
          <p className="mt-2 font-serif text-3xl">{patients.length}</p>
        </div>
        <div className="border border-[#EADBCE] bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Citas de hoy</p>
          <p className="mt-2 font-serif text-3xl">{todayAppts.length}</p>
        </div>
        <div className="border border-[#EADBCE] bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Consultas</p>
          <p className="mt-2 font-serif text-3xl">{encounters.length}</p>
        </div>
      </div>
      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href="/agenda" className="border border-[#241B16] bg-[#241B16] px-4 py-2 text-[#FAF7F2]">
          Abrir agenda
        </Link>
        <Link href="/pacientes/nuevo" className="border border-[#EADBCE] px-4 py-2">
          Registrar paciente
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="font-serif text-2xl">Hoy</h2>
        {todayAppts.length === 0 ? (
          <p className="mt-3 text-sm text-[#6D5E52]">No hay citas para hoy en FHIR Appointment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
            {todayAppts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {String(a.start || "").slice(11, 16)} ·{" "}
                  {(a.participant as { actor?: { display?: string } }[])?.map((p) => p.actor?.display).filter(Boolean).join(" · ") ||
                    displayName(a)}
                </span>
                {a.id ? <StartConsultButton appointmentId={a.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
