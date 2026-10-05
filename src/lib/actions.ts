"use server";

import { revalidatePath } from "next/cache";
import { fhirCreate, fhirDelete, fhirRead, fhirSearch, fhirUpdate, displayName, type FhirResource } from "./fhir";
import { saveHours, saveHoliday, saveLeave, saveModules, savePractitionerHours, type ClinicHours } from "./clinic-config";
import { saveIntegrativeCatalog, type IntegrativeModality } from "./integrative";
import { upsertStaff } from "./staff";
import type { RoleId } from "./roles";
import { SYSTEMS } from "./roles";
import { VITAL_FIELDS } from "./vitals";
import { requireAdmin, requireSelfOrAdmin } from "./require";
import { addMinutesToFhirDateTime, toFhirDateTime } from "./agenda";

export async function createPatientAction(formData: FormData) {
  const given = String(formData.get("given") || "").trim();
  const family = String(formData.get("family") || "").trim();
  const gender = String(formData.get("gender") || "unknown");
  const birthDate = String(formData.get("birthDate") || "");
  const created = await fhirCreate({
    resourceType: "Patient",
    active: true,
    name: [{ use: "official", given: given.split(" ").filter(Boolean), family }],
    gender,
    birthDate: birthDate || undefined,
  });
  revalidatePath("/pacientes");
  return created.id as string;
}

export async function createAppointmentAction(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const practitionerId = String(formData.get("practitionerId"));
  const start = String(formData.get("start"));
  const minutes = Number(formData.get("minutes") || 30);
  const reason = String(formData.get("reason") || "").trim();
  const patient = await fhirRead("Patient", patientId);
  const practitioner = await fhirRead("Practitioner", practitionerId);
  const startInstant = toFhirDateTime(start);
  const end = addMinutesToFhirDateTime(startInstant, minutes);
  await fhirCreate({
    resourceType: "Appointment",
    status: "booked",
    start: startInstant,
    end,
    minutesDuration: minutes,
    description: reason || undefined,
    reasonCode: reason ? [{ text: reason }] : undefined,
    participant: [
      { actor: { reference: `Patient/${patientId}`, display: displayName(patient) }, status: "accepted" },
      { actor: { reference: `Practitioner/${practitionerId}`, display: displayName(practitioner) }, status: "accepted" },
    ],
  });
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function moveAppointmentAction(formData: FormData) {
  const id = String(formData.get("id"));
  const start = String(formData.get("start"));
  const minutes = Number(formData.get("minutes") || 30);
  const appt = await fhirRead("Appointment", id);
  const duration = Number(appt.minutesDuration || minutes);
  const startInstant = toFhirDateTime(start);
  const end = addMinutesToFhirDateTime(startInstant, duration);
  await fhirUpdate({ ...appt, start: startInstant, end, minutesDuration: duration });
  revalidatePath("/agenda");
  revalidatePath("/");
}

function patientIdFromAppointment(appt: FhirResource) {
  const parts = (appt.participant as { actor?: { reference?: string } }[]) || [];
  const ref = parts.find((p) => p.actor?.reference?.startsWith("Patient/"))?.actor?.reference;
  return ref?.replace("Patient/", "") || "";
}

export async function startConsultFromAppointment(appointmentId: string) {
  const appt = await fhirRead("Appointment", appointmentId);
  const patientId = patientIdFromAppointment(appt);
  const allEncounters = await fhirSearch("Encounter");
  const existing = allEncounters.filter((enc) =>
    ((enc.appointment as { reference?: string }[] | undefined) || []).some(
      (a) => a.reference === `Appointment/${appointmentId}`,
    ),
  );
  let encounter = existing[0];
  if (!encounter) {
    encounter = await fhirCreate({
      resourceType: "Encounter",
      status: "arrived",
      class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
      subject: { reference: `Patient/${patientId}`, display: displayName(appt) },
      appointment: [{ reference: `Appointment/${appointmentId}` }],
      period: { start: new Date().toISOString() },
    });
    await fhirUpdate({ ...appt, status: "arrived" });
  }
  revalidatePath("/agenda");
  return { encounterId: encounter.id as string, patientId };
}

export async function saveSoapAction(formData: FormData) {
  const encounterId = String(formData.get("encounterId"));
  const patientId = String(formData.get("patientId"));
  const subjective = String(formData.get("subjective") || "");
  const objective = String(formData.get("objective") || "");
  const assessment = String(formData.get("assessment") || "");
  const plan = String(formData.get("plan") || "");
  let diagnoses: { code?: string; label: string }[] = [];
  let modalities: string[] = [];
  try {
    diagnoses = JSON.parse(String(formData.get("diagnoses") || "[]"));
  } catch {
    diagnoses = [];
  }
  try {
    modalities = JSON.parse(String(formData.get("modalities") || "[]"));
  } catch {
    modalities = [];
  }
  const encounter = await fhirRead("Encounter", encounterId);
  if (encounter.status === "arrived" || encounter.status === "triaged") {
    await fhirUpdate({ ...encounter, status: "in-progress" });
  }
  const compositions = await fhirSearch("Composition", { encounter: `Encounter/${encounterId}` });
  const body = { subjective, objective, assessment, plan, diagnoses, modalities };
  const resource: FhirResource = {
    resourceType: "Composition",
    ...(compositions[0]?.id ? { id: compositions[0].id } : {}),
    status: "preliminary",
    type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }] },
    date: new Date().toISOString(),
    title: "Nota SOAP",
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    section: [
      { title: "S", text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(subjective)}</div>` } },
      { title: "O", text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(objective)}</div>` } },
      { title: "A", text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(assessment)}</div>` } },
      { title: "P", text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(plan)}</div>` } },
    ],
    extension: [
      {
        url: SYSTEMS.payload,
        valueString: JSON.stringify(body),
      },
    ],
  };
  if (compositions[0]?.id) await fhirUpdate(resource);
  else await fhirCreate(resource);
  revalidatePath(`/consulta/${encounterId}`);
  revalidatePath(`/pacientes/${patientId}/consultas`);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function saveVitalsAction(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const encounterId = String(formData.get("encounterId"));
  const handoff = String(formData.get("handoff") || "") === "1";
  const values: Record<string, string> = {};
  for (const item of VITAL_FIELDS) {
    values[item.key] = String(formData.get(item.key) || "").trim();
  }
  if (values.height && values.weight && !values.bmi) {
    const m = Number(values.height) / 100;
    const kg = Number(values.weight);
    if (m > 0 && kg > 0) values.bmi = String(Math.round((kg / (m * m)) * 10) / 10);
  }
  const now = new Date().toISOString();
  for (const item of VITAL_FIELDS) {
    const value = values[item.key];
    if (!value) continue;
    await fhirCreate({
      resourceType: "Observation",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: item.code, display: item.display }] },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      effectiveDateTime: now,
      valueQuantity: { value: Number(value), unit: item.unit },
    });
  }
  if (handoff) {
    const encounter = await fhirRead("Encounter", encounterId);
    if (encounter.status === "arrived" || encounter.status === "planned") {
      await fhirUpdate({ ...encounter, status: "triaged" });
    }
  }
  revalidatePath(`/consulta/${encounterId}`);
  revalidatePath(`/consulta/${encounterId}/signos`);
  revalidatePath(`/pacientes/${patientId}`);
}

export async function beginDoctorConsultAction(encounterId: string) {
  const encounter = await fhirRead("Encounter", encounterId);
  if (encounter.status === "triaged" || encounter.status === "arrived") {
    await fhirUpdate({ ...encounter, status: "in-progress" });
    revalidatePath(`/consulta/${encounterId}`);
  }
}

export async function finalizeConsultAction(formData: FormData) {
  await saveSoapAction(formData);
  const encounterId = String(formData.get("encounterId"));
  const patientId = String(formData.get("patientId"));
  let diagnoses: { code?: string; label: string }[] = [];
  try {
    diagnoses = JSON.parse(String(formData.get("diagnoses") || "[]"));
  } catch {
    diagnoses = [];
  }
  for (const dx of diagnoses) {
    if (!dx.label && !dx.code) continue;
    await fhirCreate({
      resourceType: "Condition",
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      code: {
        text: dx.label,
        coding: dx.code ? [{ system: "http://hl7.org/fhir/sid/icd-10", code: dx.code, display: dx.label }] : undefined,
      },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
    });
  }
  const encounter = await fhirRead("Encounter", encounterId);
  await fhirUpdate({ ...encounter, status: "finished", period: { ...(encounter.period as object), end: new Date().toISOString() } });
  const appts = (encounter.appointment as { reference?: string }[] | undefined) || [];
  for (const ref of appts) {
    const id = ref.reference?.replace("Appointment/", "");
    if (!id) continue;
    const appt = await fhirRead("Appointment", id).catch(() => null);
    if (appt) await fhirUpdate({ ...appt, status: "fulfilled" });
  }
  const compositions = await fhirSearch("Composition", { encounter: `Encounter/${encounterId}` });
  if (compositions[0]?.id) {
    await fhirUpdate({ ...compositions[0], status: "final" });
  }
  revalidatePath(`/consulta/${encounterId}`);
  revalidatePath("/agenda");
}

export async function saveIntegrativeCatalogAction(items: IntegrativeModality[], id?: string) {
  await saveIntegrativeCatalog(items, id);
  revalidatePath("/config/integrativa");
}

export async function createMedicationRequestAction(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const medication = String(formData.get("medication") || "").trim();
  const dosage = String(formData.get("dosage") || "").trim();
  await fhirCreate({
    resourceType: "MedicationRequest",
    status: "active",
    intent: "order",
    medicationCodeableConcept: { text: medication },
    subject: { reference: `Patient/${patientId}` },
    authoredOn: new Date().toISOString(),
    dosageInstruction: dosage ? [{ text: dosage }] : [],
  });
  revalidatePath(`/pacientes/${patientId}/recetas`);
}

export async function createServiceRequestAction(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const code = String(formData.get("study") || "").trim();
  await fhirCreate({
    resourceType: "ServiceRequest",
    status: "active",
    intent: "order",
    code: { text: code },
    subject: { reference: `Patient/${patientId}` },
    authoredOn: new Date().toISOString(),
  });
  revalidatePath(`/pacientes/${patientId}/estudios`);
}

export async function saveDiagnosticReportAction(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const conclusion = String(formData.get("conclusion") || "").trim();
  const title = String(formData.get("title") || "Estudio");
  await fhirCreate({
    resourceType: "DiagnosticReport",
    status: "final",
    code: { text: title },
    subject: { reference: `Patient/${patientId}` },
    issued: new Date().toISOString(),
    conclusion,
  });
  revalidatePath(`/pacientes/${patientId}/estudios`);
}

export async function saveHoursAction(hours: ClinicHours, id?: string) {
  await requireAdmin();
  await saveHours(hours, id);
  revalidatePath("/config/horario");
}

export async function savePractitionerHoursAction(hours: ClinicHours, practitionerId: string, id?: string) {
  await requireSelfOrAdmin(practitionerId);
  const practitioner = await fhirRead("Practitioner", practitionerId);
  await savePractitionerHours({
    practitionerId,
    practitionerName: displayName(practitioner),
    hours,
    id,
  });
  revalidatePath("/horario");
  revalidatePath(`/personal/${practitionerId}`);
}

export async function saveHolidayAction(formData: FormData) {
  await requireAdmin();
  await saveHoliday(String(formData.get("date")), String(formData.get("name")));
  revalidatePath("/config/festivos");
}

export async function deleteHolidayAction(id: string) {
  await requireAdmin();
  await fhirDelete("Schedule", id);
  revalidatePath("/config/festivos");
}

export async function deleteResourceAction(type: string, id: string, path: string) {
  await requireAdmin();
  await fhirDelete(type, id);
  revalidatePath(path);
}

export async function saveLeaveAction(formData: FormData) {
  const practitionerId = String(formData.get("practitionerId"));
  await requireSelfOrAdmin(practitionerId);
  const practitioner = await fhirRead("Practitioner", practitionerId);
  await saveLeave({
    practitionerId,
    practitionerName: displayName(practitioner),
    start: String(formData.get("start")),
    end: String(formData.get("end")),
    reason: String(formData.get("reason")),
  });
  revalidatePath("/ausencias");
  revalidatePath("/config/ausencias");
  revalidatePath(`/personal/${practitionerId}`);
}

export async function deleteLeaveAction(id: string, practitionerId: string) {
  await requireSelfOrAdmin(practitionerId);
  const schedule = await fhirRead("Schedule", id);
  const ref = ((schedule.actor as { reference?: string }[]) || [])[0]?.reference;
  if (ref && ref !== `Practitioner/${practitionerId}`) {
    throw new Error("Esa ausencia no corresponde a este profesional.");
  }
  await fhirDelete("Schedule", id);
  revalidatePath("/ausencias");
  revalidatePath("/config/ausencias");
  revalidatePath(`/personal/${practitionerId}`);
}

export async function saveModulesAction(modules: Record<string, boolean>, id?: string) {
  await saveModules(modules, id);
  revalidatePath("/config/modulos");
}

export async function saveOrgAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  await fhirCreate({ resourceType: "Organization", name, active: true });
  revalidatePath("/config/sedes");
}

export async function saveLocationAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const orgId = String(formData.get("orgId") || "");
  await fhirCreate({
    resourceType: "Location",
    name,
    status: "active",
    managingOrganization: orgId ? { reference: `Organization/${orgId}` } : undefined,
  });
  revalidatePath("/config/sedes");
}

export async function saveServiceAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  await fhirCreate({
    resourceType: "HealthcareService",
    name,
    active: true,
  });
  revalidatePath("/config/servicios");
}

export async function saveStaffAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "") || undefined;
  await upsertStaff({
    id,
    given: String(formData.get("given")),
    family: String(formData.get("family")),
    login: String(formData.get("login")),
    email: String(formData.get("email")),
    prefix: String(formData.get("prefix") || ""),
    roles: String(formData.get("roles") || "doctor")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean) as RoleId[],
  });
  revalidatePath("/personal");
  if (id) revalidatePath(`/personal/${id}`);
}

export async function saveInventoryAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const qty = Number(formData.get("qty") || 0);
  await fhirCreate({
    resourceType: "Basic",
    code: { coding: [{ system: SYSTEMS.inventory, code: "inventory-item" }] },
    identifier: [{ system: SYSTEMS.inventory, value: `${Date.now()}` }],
    extension: [{ url: SYSTEMS.payload, valueString: JSON.stringify({ name, qty }) }],
  });
  revalidatePath("/farmacia");
}

export async function setFhirModeAction(formData: FormData) {
  const fhirMode = String(formData.get("fhirMode"));
  const fhirBaseUrl = String(formData.get("fhirBaseUrl") || "");
  const fhirAuthToken = String(formData.get("fhirAuthToken") || "");
  const proxy = process.env.FHIR_PROXY_URL || "http://localhost:3001";
  await fetch(`${proxy}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fhirMode, fhirBaseUrl, fhirAuthToken }),
  });
  revalidatePath("/config/fhir");
}
