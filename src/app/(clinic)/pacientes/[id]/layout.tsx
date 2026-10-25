import { fhirRead, displayName } from "@/lib/fhir";
import { PatientNav } from "@/components/ui";
import { loadAccessModules } from "@/lib/clinic-config";
import { canAccess, type RoleId } from "@/lib/roles";
import { requireScreen } from "@/lib/require";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireScreen("patients");
  const modules = await loadAccessModules().catch(() => ({}) as Record<string, boolean>);
  const showIris = canAccess(user.role as RoleId, "iris", modules);
  const { id } = await params;
  const patient = await fhirRead("Patient", id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Paciente</p>
      <h1 className="font-serif text-4xl">{displayName(patient)}</h1>
      <p className="mt-1 text-sm text-[#6D5E52]">
        {String(patient.gender || "")} {patient.birthDate ? `· ${patient.birthDate}` : ""} · {id}
      </p>
      <PatientNav id={id} showIris={showIris} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
