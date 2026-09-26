import Link from "next/link";
import { requireScreen } from "@/lib/require";
import { listStaff } from "@/lib/staff";
import { ROLE_LABELS, type RoleId } from "@/lib/roles";
import { StaffForm } from "@/components/StaffForm";

export default async function PersonalPage() {
  await requireScreen("personal");
  const staff = await listStaff();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Profesionales</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Practitioner y PractitionerRole. Desde cada ficha se editan horario de consulta y días libres.
      </p>
      <h2 className="mt-8 font-serif text-2xl">Alta</h2>
      <div className="mt-4">
        <StaffForm />
      </div>
      <ul className="mt-8 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
        {staff.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {s.name} · {s.login} · {s.roles.map((r) => ROLE_LABELS[r as RoleId] || r).join(", ")}
            </span>
            <Link href={`/personal/${s.id}`} className="underline">
              Administrar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
