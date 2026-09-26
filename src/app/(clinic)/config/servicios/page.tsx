import { fhirSearch } from "@/lib/fhir";
import { saveServiceAction, deleteResourceAction } from "@/lib/actions";
import { Button, Field, Input } from "@/components/ui";

export default async function ServiciosPage() {
  const services = await fhirSearch("HealthcareService");
  return (
    <div>
      <h2 className="font-serif text-2xl">Servicios</h2>
      <p className="mt-2 text-sm text-[#6D5E52]">HealthcareService.</p>
      <form action={saveServiceAction} className="mt-6 flex gap-3">
        <Field label="Nombre">
          <Input name="name" required />
        </Field>
        <div className="self-end">
          <Button type="submit">Agregar</Button>
        </div>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {services.length === 0 ? <li className="text-[#6D5E52]">Sin servicios.</li> : null}
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between border border-[#EADBCE] bg-white px-3 py-2">
            <span>{String(s.name)}</span>
            {s.id ? (
              <form
                action={async () => {
                  "use server";
                  await deleteResourceAction("HealthcareService", s.id as string, "/config/servicios");
                }}
              >
                <button className="text-xs underline">Quitar</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
