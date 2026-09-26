import { requireScreen } from "@/lib/require";
import { listStaff } from "@/lib/staff";
import { listLeaves } from "@/lib/clinic-config";
import { LeaveManager } from "@/components/LeaveManager";

export default async function AusenciasPage() {
  const user = await requireScreen("ausencias");
  if (user.role === "admin") {
    const [leaves, staff] = await Promise.all([listLeaves(), listStaff()]);
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-serif text-4xl">Días libres</h1>
        <p className="mt-2 text-sm text-[#6D5E52]">Ausencias de cualquier profesional. Cada una es un Schedule inactivo.</p>
        <LeaveManager
          staff={staff.map((s) => ({ id: s.id, name: s.name }))}
          leaves={leaves}
          showPractitioner
        />
      </div>
    );
  }

  const leaves = await listLeaves(user.id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Mis días libres</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">Vacaciones o ausencias propias. Administración también puede registrarlas.</p>
      <LeaveManager practitionerId={user.id} leaves={leaves} />
    </div>
  );
}
