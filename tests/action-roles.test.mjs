import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ACTION_ROLES, ROLES, authorizeAction, authorizePage } from "../src/lib/action-roles.js";
import { acceptAuthStaff } from "../src/lib/staff-lookup.ts";

const ALL = ["doctor", "therapist", "nurse", "receptionist", "admin", "lab", "pharmacist"];
const ADMIN = ["admin"];
const AGENDA = ["doctor", "therapist", "nurse", "receptionist", "admin"];
const CONSULT = ["doctor", "therapist", "nurse", "admin"];
const PRESCRIBE = ["doctor", "therapist", "admin"];
const STUDY_ORDER = ["doctor", "therapist", "nurse", "admin"];
const STUDY_REPORT = ["doctor", "therapist", "lab", "admin"];
const OWN_SCHEDULE = ["doctor", "therapist", "nurse", "admin"];
const PHARMACY = ["pharmacist", "admin"];

const EXPECTED_ROLES = {
  createPatientAction: ALL,
  createAppointmentAction: AGENDA,
  moveAppointmentAction: AGENDA,
  startConsultFromAppointment: CONSULT,
  saveSoapAction: CONSULT,
  saveVitalsAction: CONSULT,
  beginDoctorConsultAction: CONSULT,
  finalizeConsultAction: CONSULT,
  saveIntegrativeCatalogAction: ADMIN,
  createMedicationRequestAction: PRESCRIBE,
  createServiceRequestAction: STUDY_ORDER,
  saveDiagnosticReportAction: STUDY_REPORT,
  saveHoursAction: ADMIN,
  savePractitionerHoursAction: OWN_SCHEDULE,
  saveHolidayAction: ADMIN,
  deleteHolidayAction: ADMIN,
  deleteResourceAction: ADMIN,
  saveLeaveAction: OWN_SCHEDULE,
  deleteLeaveAction: OWN_SCHEDULE,
  saveModulesAction: ADMIN,
  saveOrgAction: ADMIN,
  saveLocationAction: ADMIN,
  saveServiceAction: ADMIN,
  saveStaffAction: ADMIN,
  saveInventoryAction: PHARMACY,
  authLogin: "public",
  authLogout: "public",
  authRequestReset: "public",
  authCompleteReset: "public",
  authSwitchRole: ALL,
  clinicalAi: CONSULT,
  fhirConfig: ADMIN,
  fhirHealth: ADMIN,
  vaultWrite: ADMIN,
  practitionerWrite: ADMIN,
  configPage: ADMIN,
  personalPage: ADMIN,
};

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("every server action is in the allow-list and enforces it", () => {
  const actionNames = new Set(Object.keys(ACTION_ROLES));
  const serverFiles = sourceFiles("src").filter((file) => fs.readFileSync(file, "utf8").includes('"use server"'));
  assert.ok(serverFiles.length >= 2);
  for (const file of serverFiles) {
    const text = fs.readFileSync(file, "utf8");
    const exports = [...text.matchAll(/export async function (\w+)/g)].map((match) => match[1]);
    if (exports.length > 0) {
      for (const name of exports) {
        assert.equal(actionNames.has(name), true, `${file} ${name}`);
        const start = text.indexOf(`export async function ${name}`);
        const next = text.indexOf("\nexport async function ", start + 10);
        const body = text.slice(start, next === -1 ? undefined : next);
        assert.match(body, new RegExp(`enforceAction\\("${name}"`), `${file} ${name}`);
      }
      continue;
    }
    const called = [...actionNames].filter((name) => new RegExp(`\\b${name}\\s*\\(`).test(text));
    assert.ok(called.length > 0, `${file} has use server but calls no mapped action`);
  }

  const routes = sourceFiles("src").filter((file) => file.endsWith(`${path.sep}route.ts`));
  for (const file of routes) {
    const text = fs.readFileSync(file, "utf8");
    const mutating = [...text.matchAll(/export async function (POST|PUT|PATCH|DELETE)\b/g)].map((match) => match[1]);
    if (mutating.length === 0) continue;
    const enforced = [...text.matchAll(/enforceRoute\(\s*"([^"]+)"/g)].map((match) => match[1]);
    assert.ok(enforced.length > 0, `${file} ${mutating.join(",")} has no enforceRoute`);
    for (const action of enforced) assert.equal(actionNames.has(action), true, `${file} ${action}`);
  }
});

test("unknown actions and roles are denied, and each listed action has an allow decision", () => {
  assert.equal(authorizeAction("not-a-real-action", "admin"), "forbidden");
  assert.equal(authorizeAction("", "admin"), "forbidden");
  assert.deepEqual(Object.keys(ACTION_ROLES).sort(), Object.keys(EXPECTED_ROLES).sort());
  for (const [action, allowed] of Object.entries(EXPECTED_ROLES)) {
    assert.deepEqual(ACTION_ROLES[action], allowed, action);
    if (allowed === "public") {
      assert.equal(authorizeAction(action, null), "ok", action);
      assert.equal(authorizeAction(action, "doctor"), "ok", action);
      assert.equal(authorizeAction(action, "owner"), "ok", action);
      continue;
    }
    assert.equal(authorizeAction(action, null), "unauthenticated", action);
    assert.equal(authorizeAction(action, undefined), "unauthenticated", action);
    assert.equal(authorizeAction(action, "owner"), "forbidden", action);
    assert.equal(authorizeAction(action, "superadmin"), "forbidden", action);
    for (const role of ROLES) {
      const decision = allowed.includes(role) ? "ok" : "forbidden";
      assert.equal(authorizeAction(action, role), decision, `${action} ${role}`);
    }
  }
});

test("configuration actions and admin pages are admin-only", () => {
  const adminOnly = [
    "saveHoursAction",
    "saveHolidayAction",
    "deleteHolidayAction",
    "deleteResourceAction",
    "saveModulesAction",
    "saveOrgAction",
    "saveLocationAction",
    "saveServiceAction",
    "saveStaffAction",
    "saveIntegrativeCatalogAction",
    "fhirConfig",
    "fhirHealth",
    "configPage",
    "personalPage",
    "vaultWrite",
    "practitionerWrite",
  ];
  for (const action of adminOnly) {
    assert.deepEqual(ACTION_ROLES[action], ["admin"], action);
    assert.equal(authorizeAction(action, "doctor"), "forbidden", action);
    assert.equal(authorizeAction(action, "admin"), "ok", action);
  }
  for (const path of ["/config", "/config/fhir", "/config/horario", "/personal", "/personal/prac-1"]) {
    assert.equal(authorizePage(path, "doctor"), "forbidden", path);
    assert.equal(authorizePage(path, "pharmacist"), "forbidden", path);
    assert.equal(authorizePage(path, "admin"), "ok", path);
    assert.equal(authorizePage(path, null), "unauthenticated", path);
  }
  assert.equal(authorizePage("/farmacia", "pharmacist"), "ok");
  assert.equal(authorizePage("/pacientes", "doctor"), "ok");
  assert.equal(authorizePage("/configuracion", "doctor"), "ok");
});

test("config pages check admin before they read admin data", () => {
  const fhir = fs.readFileSync("src/app/(clinic)/config/fhir/page.tsx", "utf8");
  assert.ok(fhir.indexOf("await requireAdmin()") < fhir.indexOf("await health()"));
  assert.match(fs.readFileSync("src/middleware.ts", "utf8"), /authorizePage/);
  for (const file of [
    "src/app/(clinic)/config/horario/page.tsx",
    "src/app/(clinic)/config/festivos/page.tsx",
    "src/app/(clinic)/config/servicios/page.tsx",
    "src/app/(clinic)/config/sedes/page.tsx",
    "src/app/(clinic)/config/modulos/page.tsx",
    "src/app/(clinic)/config/integrativa/page.tsx",
    "src/app/(clinic)/config/page.tsx",
    "src/app/(clinic)/config/ausencias/page.tsx",
    "src/app/(clinic)/config/layout.tsx",
  ]) {
    assert.match(fs.readFileSync(file, "utf8"), /requireAdmin\(/, file);
  }
});

test("staff-lookup primaryRole is the only session role accepted", () => {
  const auth = fs.readFileSync("src/app/api/auth/route.ts", "utf8");
  assert.match(auth, /user\.primaryRole/);
  const staff = acceptAuthStaff({
    id: "prac-1",
    name: "Ada",
    login: "ada",
    email: "ada@example.com",
    roles: ["admin", "doctor"],
    primaryRole: "admin",
  });
  assert.equal(staff?.primaryRole, "admin");
  assert.equal(
    acceptAuthStaff({ id: "prac-1", roles: ["doctor"], primaryRole: "admin" }),
    null,
  );
  assert.equal(acceptAuthStaff({ id: "prac-1", roles: ["doctor"] }), null);
  assert.equal(
    acceptAuthStaff({ id: "prac-1", roles: ["doctor", "owner"], primaryRole: "doctor" })?.roles.join(","),
    "doctor",
  );
});
