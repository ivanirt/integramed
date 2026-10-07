import { fhirSearch } from "@/lib/fhir";
import { saveOrgAction, saveLocationAction } from "@/lib/actions";
import { Button, Field, Input, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/require";

export default async function SedesPage() {
  await requireAdmin();
  const [orgs, locations] = await Promise.all([fhirSearch("Organization"), fhirSearch("Location")]);
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-2xl">Organizaciones</h2>
        <form action={saveOrgAction} className="mt-4 flex gap-3">
          <Field label="Nombre">
            <Input name="name" required />
          </Field>
          <div className="self-end">
            <Button type="submit">Agregar</Button>
          </div>
        </form>
        <ul className="mt-4 text-sm">
          {orgs.map((o) => (
            <li key={o.id}>{String(o.name)}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Ubicaciones</h2>
        <form action={saveLocationAction} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
          <Field label="Nombre">
            <Input name="name" required />
          </Field>
          <Field label="Organización">
            <Select name="orgId">
              <option value="">Ninguna</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {String(o.name)}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Agregar</Button>
        </form>
        <ul className="mt-4 text-sm">
          {locations.map((l) => (
            <li key={l.id}>{String(l.name)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
