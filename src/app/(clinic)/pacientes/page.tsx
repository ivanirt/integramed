import Link from "next/link";
import { fhirSearch, displayName } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";
import { Empty } from "@/components/ui";

export default async function PatientsPage() {
  await requireScreen("patients");
  const patients = await fhirSearch("Patient");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Pacientes</h1>
          <p className="mt-2 text-sm text-[#6D5E52]">Listado desde Patient. Crear vuelve al resumen de esa ficha.</p>
        </div>
        <Link href="/pacientes/nuevo" className="border border-[#241B16] bg-[#241B16] px-4 py-2 text-sm text-[#FAF7F2]">
          Nuevo paciente
        </Link>
      </div>
      {patients.length === 0 ? (
        <div className="mt-8">
          <Empty title="No hay pacientes" hint="El FHIR local está vacío. Registra el primero." />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
          {patients.map((p) => (
            <li key={p.id}>
              <Link href={`/pacientes/${p.id}`} className="block px-4 py-3 text-sm hover:bg-white">
                <span className="text-[#241B16]">{displayName(p)}</span>
                <span className="ml-3 text-[#6D5E52]">
                  {String(p.gender || "")} {p.birthDate ? `· ${p.birthDate}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
