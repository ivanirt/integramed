import { loadHours } from "@/lib/clinic-config";
import { HoursForm } from "@/components/HoursForm";
import { requireAdmin } from "@/lib/require";

export default async function HorarioPage() {
  await requireAdmin();
  const { hours, id } = await loadHours();
  return (
    <div>
      <h2 className="font-serif text-2xl">Horario</h2>
      <p className="mt-2 mb-6 text-sm text-[#6D5E52]">Schedule de la clínica, con la jornada en una extensión.</p>
      <HoursForm initial={hours} fhirId={id} />
    </div>
  );
}
