import Link from "next/link";
import { requireScreen } from "@/lib/require";
import { listStaff } from "@/lib/staff";
import { hoursSummary, listPractitionerHours, loadPractitionerHours } from "@/lib/clinic-config";
import { HoursForm } from "@/components/HoursForm";

export default async function HorarioPage() {
  const user = await requireScreen("horario");
  if (user.role === "admin") {
    const [staff, saved] = await Promise.all([listStaff(), listPractitionerHours()]);
    const byId = Object.fromEntries(saved.map((row) => [row.practitionerId, row]));
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-serif text-4xl">Horarios de consulta</h1>
        <p className="mt-2 text-sm text-[#6D5E52]">
          Cada profesional tiene un Schedule. El horario de apertura de la clínica está en{" "}
          <Link href="/config/horario" className="underline">
            Configuración
          </Link>
          .
        </p>
        <ul className="mt-8 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white text-sm">
          {staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="font-medium">{s.name}</span>
                <span className="mt-1 block text-[#6D5E52]">
                  {byId[s.id] ? hoursSummary(byId[s.id].hours) || "Sin días abiertos" : "Usa el horario de la clínica"}
                </span>
              </span>
              <Link href={`/personal/${s.id}`} className="underline">
                Editar
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const { hours, id } = await loadPractitionerHours(user.id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Mi horario de consulta</h1>
      <p className="mt-2 mb-6 text-sm text-[#6D5E52]">Días y horas en los que atiendes. Se guarda como Schedule del Practitioner.</p>
      <HoursForm initial={hours} fhirId={id} practitionerId={user.id} />
    </div>
  );
}
