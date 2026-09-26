import { fhirRead, displayName } from "@/lib/fhir";
import { PatientNav } from "@/components/ui";
import { requireScreen } from "@/lib/require";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireScreen("patients");
  const { id } = await params;
  const patient = await fhirRead("Patient", id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Paciente</p>
      <h1 className="font-serif text-4xl">{displayName(patient)}</h1>
      <p className="mt-1 text-sm text-[#6D5E52]">
        {String(patient.gender || "")} {patient.birthDate ? `· ${patient.birthDate}` : ""} · {id}
      </p>
      <PatientNav id={id} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
