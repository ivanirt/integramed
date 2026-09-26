import { redirect } from "next/navigation";
import { fhirRead, fhirSearch, readExtension, SYSTEMS, displayName, type FhirResource } from "@/lib/fhir";
import { requireScreen } from "@/lib/require";
import { loadIntegrativeCatalog } from "@/lib/integrative";
import { hasEncounterVitals, latestVitals, type HistoryNote } from "@/lib/vitals";
import { ConsultWorkspace } from "@/components/consult/ConsultWorkspace";
import Link from "next/link";

function soapFrom(composition?: FhirResource | null) {
  const payload = composition ? (readExtension(composition, SYSTEMS.payload) as Record<string, unknown> | null) : null;
  if (payload && typeof payload === "object") {
    return {
      subjective: String(payload.subjective || ""),
      objective: String(payload.objective || ""),
      assessment: String(payload.assessment || ""),
      plan: String(payload.plan || ""),
      diagnoses: Array.isArray(payload.diagnoses) ? payload.diagnoses : [],
      modalities: Array.isArray(payload.modalities) ? (payload.modalities as string[]) : [],
    };
  }
  const sections = (composition?.section as { title?: string; text?: { div?: string } }[] | undefined) || [];
  const html = (title: string) => (sections.find((s) => s.title === title)?.text?.div || "").replace(/<[^>]+>/g, "");
  return {
    subjective: html("S"),
    objective: html("O"),
    assessment: html("A"),
    plan: html("P"),
    diagnoses: [] as { code?: string; label: string }[],
    modalities: [] as string[],
  };
}

function patientIdFrom(encounter: FhirResource, query?: string) {
  if (query) return query;
  return (
    String((encounter.subject as { reference?: string } | undefined)?.reference || "").replace("Patient/", "") ||
    ((encounter.participant as { actor?: { reference?: string } }[]) || [])
      .find((p) => p.actor?.reference?.startsWith("Patient/"))
      ?.actor?.reference?.replace("Patient/", "") ||
    ""
  );
}

export default async function ConsultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paciente?: string; forzar?: string }>;
}) {
  const user = await requireScreen("consulta");
  const { id } = await params;
  const query = await searchParams;
  let encounter;
  try {
    encounter = await fhirRead("Encounter", id);
  } catch {
    encounter = await fhirRead("Appointment", id).catch(() => null);
  }
  if (!encounter) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-serif text-3xl">No hay consulta</h1>
        <Link href="/agenda" className="mt-4 inline-block underline">
          Volver a la agenda
        </Link>
      </div>
    );
  }

  if (encounter.resourceType === "Appointment") {
    const { startConsultFromAppointment } = await import("@/lib/actions");
    const started = await startConsultFromAppointment(id);
    redirect(`/consulta/${started.encounterId}?paciente=${started.patientId}`);
  }

  const patientId = patientIdFrom(encounter, query.paciente);
  const status = String(encounter.status || "");
  const nurse = user?.role === "nurse";

  if (nurse && query.forzar !== "1") {
    redirect(`/consulta/${id}/signos?paciente=${patientId}`);
  }

  const [patient, compositions, observations, catalog] = await Promise.all([
    patientId ? fhirRead("Patient", patientId) : Promise.resolve(null),
    fhirSearch("Composition"),
    patientId ? fhirSearch("Observation", { subject: `Patient/${patientId}` }) : Promise.resolve([]),
    loadIntegrativeCatalog(),
  ]);

  const vitalsHere = hasEncounterVitals(observations, id);
  if (!nurse && (status === "arrived" || status === "planned") && !vitalsHere && query.forzar !== "1") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Consulta</p>
        <h1 className="mt-2 font-serif text-4xl">{patient ? displayName(patient) : "Paciente"}</h1>
        <p className="mt-3 text-sm text-[#6D5E52]">
          Enfermería aún no toma signos y peso. El médico entra cuando el encuentro está triado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/agenda" className="border border-[#EADBCE] px-4 py-2">
            Volver a la agenda
          </Link>
          <Link href={`/consulta/${id}/signos?paciente=${patientId}`} className="border border-[#EADBCE] px-4 py-2">
            Tomar signos ahora
          </Link>
          <Link href={`/consulta/${id}?paciente=${patientId}&forzar=1`} className="underline">
            Entrar sin triaje
          </Link>
        </div>
      </div>
    );
  }

  const note = compositions.find((c) => (c.encounter as { reference?: string } | undefined)?.reference === `Encounter/${id}`);
  const soap = soapFrom(note);
  const history: HistoryNote[] = compositions
    .filter((c) => {
      const sub = (c.subject as { reference?: string } | undefined)?.reference;
      const enc = (c.encounter as { reference?: string } | undefined)?.reference;
      return sub === `Patient/${patientId}` && enc !== `Encounter/${id}`;
    })
    .map((c) => {
      const parsed = soapFrom(c);
      return {
        encounterId: String((c.encounter as { reference?: string } | undefined)?.reference || "").replace("Encounter/", "") || String(c.id),
        date: String(c.date || ""),
        title: String(c.title || "Nota"),
        subjective: parsed.subjective,
        objective: parsed.objective,
        assessment: parsed.assessment,
        plan: parsed.plan,
        diagnoses: parsed.diagnoses as { code?: string; label: string }[],
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return (
    <ConsultWorkspace
      encounterId={id}
      encounterStatus={status}
      role={user?.role || "doctor"}
      patient={{
        id: patientId,
        name: patient ? displayName(patient) : "Paciente",
        birthDate: patient ? String(patient.birthDate || "") : "",
        gender: patient ? String(patient.gender || "") : "",
      }}
      soap={soap}
      diagnoses={soap.diagnoses as { code?: string; label: string }[]}
      vitals={latestVitals(observations, id)}
      history={history}
      catalog={catalog.items}
      activeModalities={soap.modalities}
    />
  );
}
