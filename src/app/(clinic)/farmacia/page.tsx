import { fhirSearch, readExtension, SYSTEMS } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";
import { saveInventoryAction } from "@/lib/actions";
import { Button, Field, Input } from "@/components/ui";

export default async function FarmaciaPage() {
  await requireScreen("farmacia");
  const items = (await fhirSearch("Basic")).filter((b) =>
    ((b.identifier as { system?: string }[]) || []).some((i) => i.system === SYSTEMS.inventory),
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Farmacia</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">Inventario sin recurso estándar: Basic con payload.</p>
      <form action={saveInventoryAction} className="mt-8 flex max-w-xl gap-3">
        <Field label="Insumo">
          <Input name="name" required />
        </Field>
        <Field label="Cantidad">
          <Input name="qty" type="number" defaultValue={0} />
        </Field>
        <div className="self-end">
          <Button type="submit">Entrada</Button>
        </div>
      </form>
      <ul className="mt-6 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
        {items.length === 0 ? <li className="px-4 py-6 text-sm text-[#6D5E52]">Sin existencias.</li> : null}
        {items.map((item) => {
          const payload = readExtension(item, SYSTEMS.payload) as { name?: string; qty?: number } | null;
          return (
            <li key={item.id} className="px-4 py-3 text-sm">
              {payload?.name} · {payload?.qty}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
