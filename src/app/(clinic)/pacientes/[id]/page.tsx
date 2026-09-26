import Link from "next/link";
import { fhirSearch } from "@/lib/fhir";

export default async function PatientSummary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [conditions, meds, observations] = await Promise.all([
    fhirSearch("Condition", { patient: id }),
    fhirSearch("MedicationRequest", { patient: id }),
    fhirSearch("Observation", { subject: `Patient/${id}` }),
  ]);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-serif text-2xl">Resumen clínico</h2>
        <p className="mt-2 text-sm text-[#6D5E52]">
          Condiciones {conditions.length} · Recetas {meds.length} · Observaciones {observations.length}
        </p>
        <Link href={`/consulta/nueva?paciente=${id}`} className="mt-4 inline-block border border-[#EADBCE] px-4 py-2 text-sm">
          Nueva consulta
        </Link>
      </section>
      <section>
        <h3 className="font-serif text-xl">Observaciones recientes</h3>
        {observations.length === 0 ? (
          <p className="mt-2 text-sm text-[#6D5E52]">Sin Observation.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {observations.slice(0, 8).map((o) => (
              <li key={o.id}>
                {(o.code as { text?: string; coding?: { display?: string }[] })?.text ||
                  (o.code as { coding?: { display?: string }[] })?.coding?.[0]?.display}{" "}
                · {String((o.valueQuantity as { value?: number; unit?: string } | undefined)?.value ?? "")}{" "}
                {(o.valueQuantity as { unit?: string } | undefined)?.unit}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
