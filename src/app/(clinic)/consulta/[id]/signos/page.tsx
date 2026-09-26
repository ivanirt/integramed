import { fhirRead, fhirSearch, displayName } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";
import { latestVitals } from "@/lib/vitals";
import { NurseVitalsForm } from "@/components/consult/NurseVitalsForm";
import Link from "next/link";

export default async function SignosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paciente?: string }>;
}) {
  await requireScreen("consulta");
  const { id } = await params;
  const { paciente } = await searchParams;
  const encounter = await fhirRead("Encounter", id).catch(() => null);
  if (!encounter) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-serif text-3xl">No hay encuentro</h1>
        <Link href="/agenda" className="mt-4 inline-block underline">
          Agenda
        </Link>
      </div>
    );
  }
  const patientId =
    paciente ||
    String((encounter.subject as { reference?: string } | undefined)?.reference || "").replace("Patient/", "");
  const [patient, observations] = await Promise.all([
    patientId ? fhirRead("Patient", patientId) : Promise.resolve(null),
    patientId ? fhirSearch("Observation", { subject: `Patient/${patientId}` }) : Promise.resolve([]),
  ]);
  return (
    <NurseVitalsForm
      encounterId={id}
      patientId={patientId}
      patientName={patient ? displayName(patient) : "Paciente"}
      initial={latestVitals(observations, id)}
    />
  );
}
