import { listHolidays } from "@/lib/clinic-config";
import { saveHolidayAction, deleteHolidayAction } from "@/lib/actions";
import { Button, Field, Input } from "@/components/ui";
import { requireAdmin } from "@/lib/require";

export default async function FestivosPage() {
  await requireAdmin();
  const holidays = await listHolidays();
  return (
    <div>
      <h2 className="font-serif text-2xl">Días festivos</h2>
      <p className="mt-2 text-sm text-[#6D5E52]">Cierres de clínica. Cada uno es un Schedule inactivo de un día. Solo administración.</p>
      <form action={saveHolidayAction} className="mt-6 grid max-w-lg gap-3 sm:grid-cols-2">
        <Field label="Fecha">
          <Input type="date" name="date" required />
        </Field>
        <Field label="Nombre">
          <Input name="name" required />
        </Field>
        <Button type="submit">Agregar</Button>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {holidays.length === 0 ? (
          <li className="border border-[#EADBCE] bg-white px-3 py-4 text-[#6D5E52]">Sin festivos.</li>
        ) : (
          holidays.map((h) => (
            <li key={h.id} className="flex justify-between border border-[#EADBCE] bg-white px-3 py-2">
              <span>
                {h.date} · {h.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await deleteHolidayAction(h.id);
                }}
              >
                <button type="submit" className="underline">
                  Quitar
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
