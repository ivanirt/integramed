import { EyeDiagnosis } from "@/components/iris/EyeDiagnosis";
import { displayName, fhirSearch } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";

export default async function IrisPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>;
}) {
  await requireScreen("iris");
  const { paciente } = await searchParams;
  let patients: { id: string; name: string }[] = [];
  try {
    const list = await fhirSearch("Patient");
    patients = list
      .map((patient) => ({ id: patient.id || "", name: displayName(patient) }))
      .filter((patient) => patient.id);
  } catch {
    patients = [];
  }
  return <EyeDiagnosis patients={patients} initialPatientId={paciente || ""} />;
}
