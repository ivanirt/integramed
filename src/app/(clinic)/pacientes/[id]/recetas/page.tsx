import { fhirSearch } from "@/lib/fhir";
import { createMedicationRequestAction } from "@/lib/actions";
import { Button, Field, Input } from "@/components/ui";

export default async function RecetasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meds = await fhirSearch("MedicationRequest", { patient: id });
  return (
    <div>
      <h2 className="font-serif text-2xl">Recetas</h2>
      <p className="mt-2 text-sm text-[#6D5E52]">Cada receta es un MedicationRequest.</p>
      <form action={createMedicationRequestAction} className="mt-6 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="patientId" value={id} />
        <Field label="Medicamento">
          <Input name="medication" required />
        </Field>
        <Field label="Indicación">
          <Input name="dosage" />
        </Field>
        <Button type="submit">Guardar receta</Button>
      </form>
      <ul className="mt-6 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
        {meds.length === 0 ? (
          <li className="px-4 py-6 text-sm text-[#6D5E52]">Sin MedicationRequest.</li>
        ) : (
          meds.map((m) => (
            <li key={m.id} className="px-4 py-3 text-sm">
              {(m.medicationCodeableConcept as { text?: string } | undefined)?.text} · {String(m.status)} ·{" "}
              {(m.dosageInstruction as { text?: string }[] | undefined)?.[0]?.text}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
