import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { ACTION_ROLES, ROLES, authorizeAction, authorizePage } from "../src/lib/action-roles.js";
import { acceptAuthStaff } from "../src/lib/staff-lookup.ts";

const SERVER_ACTION_FILES = [
  ["src/components/LeaveManager.tsx", "deleteLeaveAction"],
  ["src/app/(clinic)/config/festivos/page.tsx", "deleteHolidayAction"],
  ["src/app/(clinic)/config/servicios/page.tsx", "deleteResourceAction"],
];

const ROUTE_CALLS = [
  ["src/app/api/auth/route.ts", "authLogin"],
  ["src/app/api/auth/route.ts", "authLogout"],
  ["src/app/api/auth/route.ts", "authSwitchRole"],
  ["src/app/api/auth/recuperar/route.ts", "authRequestReset"],
  ["src/app/api/auth/restablecer/route.ts", "authCompleteReset"],
  ["src/app/api/ai/clinical/route.ts", "clinicalAi"],
];

test("every server action is in the allow-list and enforces it", () => {
  const src = fs.readFileSync("src/lib/actions.ts", "utf8");
  const names = [...src.matchAll(/export async function (\w+)/g)].map((match) => match[1]);
  assert.ok(names.length >= 20);
  for (const name of names) {
    const start = src.indexOf(`export async function ${name}`);
    const next = src.indexOf("\nexport async function ", start + 10);
    const body = src.slice(start, next === -1 ? undefined : next);
    assert.match(body, new RegExp(`enforceAction\\("${name}"`), name);
    assert.equal(Object.prototype.hasOwnProperty.call(ACTION_ROLES, name), true, name);
  }
  for (const [file, callee] of SERVER_ACTION_FILES) {
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /"use server"/, file);
    assert.match(text, new RegExp(`\\b${callee}\\b`), file);
  }
  for (const [file, action] of ROUTE_CALLS) {
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, new RegExp(`enforceRoute\\("${action}"`), `${file} ${action}`);
    assert.equal(Object.prototype.hasOwnProperty.call(ACTION_ROLES, action), true, action);
  }
});

test("unknown actions and roles are denied, and each listed action has an allow decision", () => {
  assert.equal(authorizeAction("not-a-real-action", "admin"), "forbidden");
  assert.equal(authorizeAction("", "admin"), "forbidden");
  for (const [action, allowed] of Object.entries(ACTION_ROLES)) {
    if (allowed === "public") {
      assert.equal(authorizeAction(action, null), "ok", action);
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
    assert.equal(authorizeAction(action, allowed[0]), "ok", action);
    const lower = ROLES.find((role) => !allowed.includes(role));
    if (lower) assert.equal(authorizeAction(action, lower), "forbidden", `${action} ${lower}`);
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
