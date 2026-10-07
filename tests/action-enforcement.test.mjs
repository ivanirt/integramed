import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";
import { signSession } from "../server/sessionAuth.js";
import { DEFAULT_HOURS } from "../src/lib/clinic-config.ts";
import { SYSTEMS } from "../src/lib/roles.ts";
import { withSession } from "../src/lib/session.ts";
import * as actions from "../src/lib/actions.ts";
import { POST as authPost } from "../src/app/api/auth/route.ts";
import { POST as resetPost } from "../src/app/api/auth/recuperar/route.ts";
import { POST as completeResetPost } from "../src/app/api/auth/restablecer/route.ts";
import { POST as aiPost } from "../src/app/api/ai/clinical/route.ts";

const SECRET = `s${"e".repeat(47)}`;
const PROXY_SECRET = `p${"x".repeat(47)}`;
const LOGIN = "https://integramed.app/fhir/login";
const ROLE = "https://integramed.app/fhir/role";
const TYPES = [
  "Patient",
  "Practitioner",
  "PractitionerRole",
  "Appointment",
  "Encounter",
  "Observation",
  "Composition",
  "Condition",
  "MedicationRequest",
  "ServiceRequest",
  "DiagnosticReport",
  "Schedule",
  "Basic",
  "Organization",
  "Location",
  "HealthcareService",
];

const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-actions-"));
process.env.SESSION_SECRET = SECRET;
process.env.FHIR_PROXY_SECRET = PROXY_SECRET;
process.env.FHIR_MODE = "local";
process.env.INTEGRAMED_ACTION_TEST = "1";
process.env.INTEGRAMED_DATA_ROOT = dataRoot;
process.env.INTEGRAMED_FHIR_ROOT = path.join(dataRoot, "fhir");
process.env.INTEGRAMED_AUTH_ROOT = path.join(dataRoot, "auth");
process.env.CLINICAL_AI_KEY = "";
delete process.env.FHIR_PROXY_NO_LISTEN;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function actor(role, id) {
  return { id, name: "Prueba", login: role, role };
}

function adminHeaders() {
  const token = signSession(
    { id: "prac-admin", name: "Admin", login: "admin", role: "admin", pwdAt: Date.now() },
    SECRET,
  );
  return {
    cookie: `integramed_session=${token}`,
    "x-integramed-proxy-secret": PROXY_SECRET,
    "content-type": "application/fhir+json",
    accept: "application/fhir+json",
  };
}

let origin = "";

async function seed(type, id, body) {
  const res = await fetch(`${origin}/api/fhir/${type}/${id}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ ...body, resourceType: type, id }),
  });
  const text = await res.text();
  assert.ok(res.status === 200 || res.status === 201, `${type}/${id} ${res.status} ${text}`);
}

async function readResource(type, id) {
  const res = await fetch(`${origin}/api/fhir/${type}/${id}`, { headers: adminHeaders() });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function snapshot() {
  const out = {};
  for (const type of TYPES) {
    const res = await fetch(`${origin}/api/fhir/${type}?_count=200`, { headers: adminHeaders() });
    const data = await res.json();
    out[type] = (data.entry || []).map((entry) => entry.resource?.id).filter(Boolean).sort();
  }
  return JSON.stringify(out);
}

async function expectDenied(label, role, id, fn) {
  const before = await snapshot();
  await assert.rejects(() => withSession(actor(role, id), fn), (err) => isRedirectError(err), label);
  assert.equal(await snapshot(), before, `${label} wrote state`);
}

function form(entries) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function jsonRequest(pathname, body) {
  return new Request(`http://127.0.0.1${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("each sensitive action denies a lower role and lets an allowed role succeed", { timeout: 120_000 }, async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  process.env.FHIR_PROXY_URL = origin;
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
    env: { ...process.env, FHIR_PROXY_PORT: String(port), NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });
  try {
    const start = Date.now();
    let ready = false;
    while (Date.now() - start < 20_000) {
      try {
        const res = await fetch(`${origin}/api/health`);
        if (res.status === 401) {
          ready = true;
          break;
        }
      } catch {
        /* proxy still booting */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, log.slice(-1000));

    await seed("Practitioner", "prac-doc", {
      active: true,
      name: [{ use: "official", family: "Doc", given: ["Ada"] }],
      identifier: [
        { system: LOGIN, value: "ada" },
        { system: ROLE, value: "doctor" },
      ],
    });
    await seed("Practitioner", "prac-other", {
      active: true,
      name: [{ use: "official", family: "Other", given: ["Bo"] }],
      identifier: [
        { system: LOGIN, value: "bo" },
        { system: ROLE, value: "doctor" },
      ],
    });
    await seed("PractitionerRole", "role-doc", {
      active: true,
      practitioner: { reference: "Practitioner/prac-doc" },
      code: [{ coding: [{ system: ROLE, code: "doctor" }] }],
    });
    await seed("Patient", "pat-1", { active: true, name: [{ family: "Paz", given: ["Luz"] }] });
    await seed("Appointment", "appt-1", {
      status: "booked",
      start: "2026-10-08T15:00:00",
      end: "2026-10-08T15:30:00",
      minutesDuration: 30,
      participant: [
        { actor: { reference: "Patient/pat-1", display: "Luz" }, status: "accepted" },
        { actor: { reference: "Practitioner/prac-doc", display: "Ada" }, status: "accepted" },
      ],
    });
    await seed("Appointment", "appt-2", {
      status: "booked",
      start: "2026-10-08T16:00:00",
      end: "2026-10-08T16:30:00",
      minutesDuration: 30,
      participant: [
        { actor: { reference: "Patient/pat-1", display: "Luz" }, status: "accepted" },
        { actor: { reference: "Practitioner/prac-doc", display: "Ada" }, status: "accepted" },
      ],
    });
    await seed("Encounter", "enc-1", {
      status: "arrived",
      subject: { reference: "Patient/pat-1" },
    });
    await seed("Encounter", "enc-2", {
      status: "in-progress",
      subject: { reference: "Patient/pat-1" },
    });

    await expectDenied("createPatient", null, "nobody", () =>
      actions.createPatientAction(form({ given: "No", family: "Anon" })),
    );
    const patientId = await withSession(actor("receptionist", "prac-rec"), () =>
      actions.createPatientAction(form({ given: "Nia", family: "Sol" })),
    );
    assert.equal((await readResource("Patient", patientId)).status, 200);

    await expectDenied("unauthenticated patient", null, "nobody", () =>
      actions.createPatientAction(form({ given: "X", family: "Y" })),
    );

    await expectDenied("createAppointment", "pharmacist", "prac-pharm", () =>
      actions.createAppointmentAction(
        form({ patientId: "pat-1", practitionerId: "prac-doc", start: "2026-10-09T09:00", minutes: "30" }),
      ),
    );
    await withSession(actor("receptionist", "prac-rec"), () =>
      actions.createAppointmentAction(
        form({ patientId: "pat-1", practitionerId: "prac-doc", start: "2026-10-09T09:00", minutes: "30" }),
      ),
    );
    const appointments = JSON.parse(await snapshot()).Appointment;
    assert.ok(appointments.length >= 3);

    await expectDenied("moveAppointment", "lab", "prac-lab", () =>
      actions.moveAppointmentAction(form({ id: "appt-1", start: "2026-10-08T17:00" })),
    );
    await withSession(actor("doctor", "prac-doc"), () =>
      actions.moveAppointmentAction(form({ id: "appt-1", start: "2026-10-08T17:00" })),
    );
    assert.match((await readResource("Appointment", "appt-1")).body.start, /^2026-10-08T17:00:00/);

    await expectDenied("startConsult", "receptionist", "prac-rec", () =>
      actions.startConsultFromAppointment("appt-2"),
    );
    const started = await withSession(actor("nurse", "prac-nurse"), () => actions.startConsultFromAppointment("appt-2"));
    assert.ok(started.encounterId);
    assert.equal((await readResource("Encounter", started.encounterId)).status, 200);

    await expectDenied("saveVitals", "pharmacist", "prac-pharm", () =>
      actions.saveVitalsAction(form({ patientId: "pat-1", encounterId: "enc-1", weight: "70" })),
    );
    await withSession(actor("nurse", "prac-nurse"), () =>
      actions.saveVitalsAction(form({ patientId: "pat-1", encounterId: "enc-1", weight: "70" })),
    );
    assert.ok(JSON.parse(await snapshot()).Observation.length >= 1);

    await expectDenied("beginConsult", "receptionist", "prac-rec", () => actions.beginDoctorConsultAction("enc-1"));
    await withSession(actor("doctor", "prac-doc"), () => actions.beginDoctorConsultAction("enc-1"));
    assert.equal((await readResource("Encounter", "enc-1")).body.status, "in-progress");

    await expectDenied("saveSoap", "pharmacist", "prac-pharm", () =>
      actions.saveSoapAction(
        form({
          encounterId: "enc-1",
          patientId: "pat-1",
          subjective: "dolor",
          objective: "",
          assessment: "",
          plan: "",
          diagnoses: "[]",
          modalities: "[]",
        }),
      ),
    );
    await withSession(actor("doctor", "prac-doc"), () =>
      actions.saveSoapAction(
        form({
          encounterId: "enc-1",
          patientId: "pat-1",
          subjective: "dolor",
          objective: "",
          assessment: "",
          plan: "",
          diagnoses: "[]",
          modalities: "[]",
        }),
      ),
    );
    assert.ok(JSON.parse(await snapshot()).Composition.length >= 1);

    await expectDenied("finalize", "receptionist", "prac-rec", () =>
      actions.finalizeConsultAction(
        form({
          encounterId: "enc-2",
          patientId: "pat-1",
          subjective: "ok",
          objective: "",
          assessment: "cef",
          plan: "reposo",
          diagnoses: JSON.stringify([{ code: "R51", label: "Cefalea" }]),
          modalities: "[]",
        }),
      ),
    );
    await withSession(actor("therapist", "prac-th"), () =>
      actions.finalizeConsultAction(
        form({
          encounterId: "enc-2",
          patientId: "pat-1",
          subjective: "ok",
          objective: "",
          assessment: "cef",
          plan: "reposo",
          diagnoses: JSON.stringify([{ code: "R51", label: "Cefalea" }]),
          modalities: "[]",
        }),
      ),
    );
    assert.equal((await readResource("Encounter", "enc-2")).body.status, "finished");
    assert.ok(JSON.parse(await snapshot()).Condition.length >= 1);

    await expectDenied("medication", "nurse", "prac-nurse", () =>
      actions.createMedicationRequestAction(form({ patientId: "pat-1", medication: "Ibuprofeno", dosage: "1" })),
    );
    await withSession(actor("doctor", "prac-doc"), () =>
      actions.createMedicationRequestAction(form({ patientId: "pat-1", medication: "Ibuprofeno", dosage: "1" })),
    );
    assert.ok(JSON.parse(await snapshot()).MedicationRequest.length >= 1);

    await expectDenied("service", "pharmacist", "prac-pharm", () =>
      actions.createServiceRequestAction(form({ patientId: "pat-1", study: "Hemograma" })),
    );
    await withSession(actor("nurse", "prac-nurse"), () =>
      actions.createServiceRequestAction(form({ patientId: "pat-1", study: "Hemograma" })),
    );
    assert.ok(JSON.parse(await snapshot()).ServiceRequest.length >= 1);

    await expectDenied("report", "receptionist", "prac-rec", () =>
      actions.saveDiagnosticReportAction(form({ patientId: "pat-1", title: "Hemograma", conclusion: "normal" })),
    );
    await withSession(actor("lab", "prac-lab"), () =>
      actions.saveDiagnosticReportAction(form({ patientId: "pat-1", title: "Hemograma", conclusion: "normal" })),
    );
    assert.ok(JSON.parse(await snapshot()).DiagnosticReport.length >= 1);

    const hours = structuredClone(DEFAULT_HOURS);
    await expectDenied("hours", "doctor", "prac-doc", () => actions.saveHoursAction(hours));
    await withSession(actor("admin", "prac-admin"), () => actions.saveHoursAction(hours));
    assert.ok(JSON.parse(await snapshot()).Schedule.length >= 1);

    const clinicIds = JSON.parse(await snapshot()).Schedule;
    assert.equal(clinicIds.length, 1);
    const clinicId = clinicIds[0];
    const clinicBefore = await readResource("Schedule", clinicId);
    const stolen = structuredClone(hours);
    stolen.slotDurationMinutes = 5;
    await withSession(actor("doctor", "prac-doc"), () =>
      actions.savePractitionerHoursAction(stolen, "prac-other", clinicId),
    );
    const clinicAfterSteal = await readResource("Schedule", clinicId);
    assert.equal(clinicAfterSteal.body.identifier?.[0]?.system, clinicBefore.body.identifier?.[0]?.system, "foreign id");
    assert.equal(clinicAfterSteal.body.identifier?.[0]?.value, "clinic", "foreign id");
    assert.equal(JSON.stringify(clinicAfterSteal.body.actor), JSON.stringify(clinicBefore.body.actor), "foreign id");

    await withSession(actor("admin", "prac-admin"), () => actions.savePractitionerHoursAction(hours, "prac-other"));
    const withOther = JSON.parse(await snapshot()).Schedule;
    let otherId = "";
    for (const id of withOther) {
      const row = await readResource("Schedule", id);
      if (row.body.actor?.[0]?.reference === "Practitioner/prac-other") otherId = id;
    }
    assert.ok(otherId, "foreign id");
    const otherBefore = await readResource("Schedule", otherId);
    await withSession(actor("doctor", "prac-doc"), () =>
      actions.savePractitionerHoursAction(stolen, "prac-other", otherId),
    );
    const otherAfter = await readResource("Schedule", otherId);
    assert.equal(otherAfter.body.actor?.[0]?.reference, "Practitioner/prac-other", "foreign id");
    assert.equal(otherAfter.body.identifier?.[0]?.value, "prac-other", "foreign id");
    assert.equal(otherAfter.body.comment, otherBefore.body.comment, "foreign id");
    const clinicStill = await readResource("Schedule", clinicId);
    assert.equal(clinicStill.body.identifier?.[0]?.value, "clinic", "foreign id");

    await withSession(actor("doctor", "prac-doc"), () => actions.savePractitionerHoursAction(hours, "prac-doc"));

    await expectDenied("holiday", "doctor", "prac-doc", () =>
      actions.saveHolidayAction(form({ date: "2026-12-25", name: "Navidad" })),
    );
    const beforeHoliday = JSON.parse(await snapshot()).Schedule;
    await withSession(actor("admin", "prac-admin"), () =>
      actions.saveHolidayAction(form({ date: "2026-12-25", name: "Navidad" })),
    );
    const holidayId = JSON.parse(await snapshot()).Schedule.find((id) => !beforeHoliday.includes(id));
    assert.ok(holidayId);
    await expectDenied("delete holiday", "nurse", "prac-nurse", () => actions.deleteHolidayAction(holidayId));
    await expectDenied("delete holiday as leave", "doctor", "prac-doc", () =>
      actions.deleteLeaveAction(holidayId, "prac-doc"),
    );
    await expectDenied("delete clinic hours as leave", "doctor", "prac-doc", () =>
      actions.deleteLeaveAction(clinicId, ""),
    );
    assert.equal((await readResource("Schedule", holidayId)).status, 200, "holiday");
    assert.equal((await readResource("Schedule", clinicId)).body.identifier?.[0]?.value, "clinic", "clinic-hours");
    await withSession(actor("admin", "prac-admin"), () => actions.deleteHolidayAction(holidayId));
    assert.equal((await readResource("Schedule", holidayId)).status, 404);

    const beforeEmpty = JSON.parse(await snapshot()).Schedule;
    await withSession(actor("doctor", "prac-doc"), () =>
      actions.saveLeaveAction(form({ practitionerId: "", start: "2026-11-01", end: "2026-11-02", reason: "Viaje" })),
    );
    const afterEmpty = JSON.parse(await snapshot()).Schedule;
    const createdIds = afterEmpty.filter((id) => !beforeEmpty.includes(id));
    assert.equal(createdIds.length, 1, "empty practitionerId");
    const ownLeave = await readResource("Schedule", createdIds[0]);
    assert.equal(ownLeave.body.actor?.[0]?.reference, "Practitioner/prac-doc", "empty practitionerId");
    assert.equal(ownLeave.body.identifier?.[0]?.system, SYSTEMS.leave, "empty practitionerId");
    const leaveId = createdIds[0];

    await withSession(actor("admin", "prac-admin"), () =>
      actions.saveLeaveAction(form({ practitionerId: "prac-other", start: "2026-11-08", end: "2026-11-09", reason: "Congreso" })),
    );
    const foreignLeaveId = JSON.parse(await snapshot()).Schedule.find((id) => !afterEmpty.includes(id));
    assert.ok(foreignLeaveId);
    await expectDenied("foreign leave id", "doctor", "prac-doc", () =>
      actions.deleteLeaveAction(foreignLeaveId, "prac-doc"),
    );
    assert.equal((await readResource("Schedule", foreignLeaveId)).body.actor?.[0]?.reference, "Practitioner/prac-other");

    await expectDenied("delete leave", "receptionist", "prac-rec", () => actions.deleteLeaveAction(leaveId, "prac-doc"));
    await withSession(actor("doctor", "prac-doc"), () => actions.deleteLeaveAction(leaveId, "prac-doc"));
    assert.equal((await readResource("Schedule", leaveId)).status, 404);

    await expectDenied("modules", "doctor", "prac-doc", () => actions.saveModulesAction({ home: true, agenda: false }));
    await withSession(actor("admin", "prac-admin"), () => actions.saveModulesAction({ home: true, agenda: false }));
    assert.ok(JSON.parse(await snapshot()).Basic.length >= 1);

    await expectDenied("catalog", "doctor", "prac-doc", () =>
      actions.saveIntegrativeCatalogAction([{ id: "tcm", labelEs: "China", enabled: true }]),
    );
    await withSession(actor("admin", "prac-admin"), () =>
      actions.saveIntegrativeCatalogAction([{ id: "tcm", labelEs: "China", enabled: true }]),
    );

    await expectDenied("org", "therapist", "prac-th", () => actions.saveOrgAction(form({ name: "Sede Norte" })));
    await withSession(actor("admin", "prac-admin"), () => actions.saveOrgAction(form({ name: "Sede Norte" })));
    assert.ok(JSON.parse(await snapshot()).Organization.length >= 1);

    await expectDenied("location", "nurse", "prac-nurse", () => actions.saveLocationAction(form({ name: "Consultorio 1" })));
    await withSession(actor("admin", "prac-admin"), () => actions.saveLocationAction(form({ name: "Consultorio 1" })));
    assert.ok(JSON.parse(await snapshot()).Location.length >= 1);

    await expectDenied("service", "doctor", "prac-doc", () => actions.saveServiceAction(form({ name: "Consulta" })));
    await withSession(actor("admin", "prac-admin"), () => actions.saveServiceAction(form({ name: "Consulta" })));
    const serviceId = JSON.parse(await snapshot()).HealthcareService[0];
    assert.ok(serviceId);
    await expectDenied("delete service", "doctor", "prac-doc", () =>
      actions.deleteResourceAction("HealthcareService", serviceId, "/config/servicios"),
    );
    await withSession(actor("admin", "prac-admin"), () =>
      actions.deleteResourceAction("HealthcareService", serviceId, "/config/servicios"),
    );
    assert.equal((await readResource("HealthcareService", serviceId)).status, 404);

    await expectDenied("staff", "doctor", "prac-doc", () =>
      actions.saveStaffAction(form({ given: "Nia", family: "Lopez", login: "nia", email: "nia@example.com", roles: "nurse" })),
    );
    await withSession(actor("admin", "prac-admin"), () =>
      actions.saveStaffAction(form({ given: "Nia", family: "Lopez", login: "nia", email: "nia@example.com", roles: "nurse" })),
    );
    assert.ok(JSON.parse(await snapshot()).Practitioner.includes("prac-doc"));
    assert.ok(JSON.parse(await snapshot()).Practitioner.length >= 3);

    await expectDenied("inventory", "doctor", "prac-doc", () =>
      actions.saveInventoryAction(form({ name: "Gasas", qty: "4" })),
    );
    await withSession(actor("pharmacist", "prac-pharm"), () =>
      actions.saveInventoryAction(form({ name: "Gasas", qty: "4" })),
    );

    const loggedOut = await withSession(null, () => authPost(jsonRequest("/api/auth", { action: "logout" })));
    assert.equal(loggedOut.status, 200);
    const loginAttempt = await withSession(null, () => authPost(jsonRequest("/api/auth", { login: "", password: "" })));
    assert.equal(loginAttempt.status, 400);
    const resetAttempt = await withSession(actor("doctor", "prac-doc"), () =>
      resetPost(jsonRequest("/api/auth/recuperar", { email: "not-an-email" })),
    );
    assert.equal(resetAttempt.status, 400);
    const completeReset = await withSession(null, () =>
      completeResetPost(jsonRequest("/api/auth/restablecer", { token: "", password: "", confirm: "" })),
    );
    assert.equal(completeReset.status, 400);

    const switchDenied = await withSession(actor("doctor", "prac-doc"), () =>
      authPost(jsonRequest("/api/auth", { action: "switch-role", role: "admin" })),
    );
    assert.equal(switchDenied.status, 403);
    const switchOk = await withSession(actor("doctor", "prac-doc"), () =>
      authPost(jsonRequest("/api/auth", { action: "switch-role", role: "doctor" })),
    );
    assert.equal(switchOk.status, 200);
    assert.equal((await switchOk.json()).user.role, "doctor");
    const switchAnon = await withSession(null, () =>
      authPost(jsonRequest("/api/auth", { action: "switch-role", role: "admin" })),
    );
    assert.equal(switchAnon.status, 401);

    const aiDenied = await withSession(actor("pharmacist", "prac-pharm"), () =>
      aiPost(jsonRequest("/api/ai/clinical", { diagnosis: "cefalea" })),
    );
    assert.equal(aiDenied.status, 403);
    const aiAllowed = await withSession(actor("doctor", "prac-doc"), () =>
      aiPost(jsonRequest("/api/ai/clinical", { diagnosis: "cefalea" })),
    );
    assert.notEqual(aiAllowed.status, 401);
    assert.notEqual(aiAllowed.status, 403);
  } catch (err) {
    const detail = err instanceof Error ? err.stack || err.message : String(err);
    throw new Error(`${detail}\n--- proxy ---\n${log.slice(-2500)}`);
  } finally {
    if (!child.killed) child.kill("SIGTERM");
  }
});
