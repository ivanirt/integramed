import { displayName } from "@/lib/fhir";
import { fhirSearch } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";
import { listStaff } from "@/lib/staff";
import { mapAppointment } from "@/lib/agenda";
import { WeeklyAgenda } from "@/components/WeeklyAgenda";
import Link from "next/link";

export default async function AgendaPage() {
  await requireScreen("agenda");
  const [appointments, patients, staff] = await Promise.all([
    fhirSearch("Appointment"),
    fhirSearch("Patient"),
    listStaff(),
  ]);
  const items = appointments.map(mapAppointment).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      {patients.length === 0 ? (
        <p className="mb-6 text-sm text-[#6D5E52]">
          Primero <Link href="/pacientes/nuevo" className="underline">registra un paciente</Link> para poder agendar.
        </p>
      ) : null}
      <WeeklyAgenda
        items={items}
        today={new Date().toISOString().slice(0, 10)}
        patients={patients.map((p) => ({ id: p.id || "", name: displayName(p) })).filter((p) => p.id)}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
