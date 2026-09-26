import { redirect } from "next/navigation";
import { fhirCreate, displayName, fhirRead } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";

export default async function NewConsult({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>;
}) {
  const user = await requireScreen("consulta");
  const { paciente } = await searchParams;
  if (!paciente) redirect("/pacientes");
  const patient = await fhirRead("Patient", paciente);
  const encounter = await fhirCreate({
    resourceType: "Encounter",
    status: "arrived",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
    subject: { reference: `Patient/${paciente}`, display: displayName(patient) },
    period: { start: new Date().toISOString() },
  });
  if (user?.role === "nurse") {
    redirect(`/consulta/${encounter.id}/signos?paciente=${paciente}`);
  }
  redirect(`/consulta/${encounter.id}?paciente=${paciente}`);
}
