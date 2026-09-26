import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScreen } from "@/lib/require";
import { listStaff } from "@/lib/staff";
import { loadPractitionerHours, listLeaves } from "@/lib/clinic-config";
import { StaffForm } from "@/components/StaffForm";
import { HoursForm } from "@/components/HoursForm";
import { LeaveManager } from "@/components/LeaveManager";

export default async function PractitionerAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireScreen("personal");
  const { id } = await params;
  const staff = await listStaff();
  const person = staff.find((s) => s.id === id);
  if (!person) notFound();
  const name = person.resource.name as { given?: string[]; family?: string; prefix?: string[] }[] | undefined;
  const official = name?.[0];
  const [hours, leaves] = await Promise.all([loadPractitionerHours(id), listLeaves(id)]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/personal" className="text-sm underline">
        Personal
      </Link>
      <h1 className="mt-4 font-serif text-4xl">{person.name}</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">Identidad, horario de consulta y días libres de este Practitioner.</p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Datos</h2>
        <div className="mt-4">
          <StaffForm
            initial={{
              id: person.id,
              given: (official?.given || []).join(" "),
              family: official?.family || "",
              prefix: official?.prefix?.[0] || "",
              login: person.login,
              email: person.email,
              roles: person.roles,
            }}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Horario de consulta</h2>
        <p className="mt-2 mb-4 text-sm text-[#6D5E52]">Schedule propio. Si aún no existe, parte del horario de la clínica.</p>
        <HoursForm initial={hours.hours} fhirId={hours.id} practitionerId={id} />
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Días libres</h2>
        <LeaveManager practitionerId={id} leaves={leaves} />
      </section>
    </div>
  );
}
