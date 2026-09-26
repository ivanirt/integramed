import Link from "next/link";
import { fhirSearch } from "@/lib/fhir";

export default async function PatientConsults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encounters = await fhirSearch("Encounter", { patient: id });
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">Consultas</h2>
        <Link href={`/consulta/nueva?paciente=${id}`} className="border border-[#EADBCE] px-4 py-2 text-sm">
          Nueva consulta
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
        {encounters.length === 0 ? (
          <li className="px-4 py-6 text-sm text-[#6D5E52]">Sin Encounter.</li>
        ) : (
          encounters.map((e) => (
            <li key={e.id} className="px-4 py-3 text-sm">
              <Link href={`/consulta/${e.id}?paciente=${id}`} className="underline">
                {String(e.status)} · {(e.period as { start?: string } | undefined)?.start?.slice(0, 16) || e.id}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
