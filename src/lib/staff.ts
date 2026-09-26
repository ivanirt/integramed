import {
  fhirCreate,
  fhirSearch,
  fhirUpdate,
  displayName,
  identifierValue,
  SYSTEMS,
  type FhirResource,
} from "./fhir";
import { type RoleId } from "./roles";

export type StaffMember = {
  id: string;
  name: string;
  login: string;
  email: string;
  roles: RoleId[];
  primaryRole: RoleId;
  resource: FhirResource;
};

function rolesFromPractitioner(p: FhirResource, roleResources: FhirResource[]): RoleId[] {
  const linked = roleResources.filter((r) => {
    const ref = (r.practitioner as { reference?: string } | undefined)?.reference;
    return ref === `Practitioner/${p.id}`;
  });
  const fromRoles = linked
    .flatMap((r) => ((r.code as { coding?: { code?: string }[] }[]) || []).flatMap((c) => c.coding || []))
    .map((c) => c.code)
    .filter(Boolean) as RoleId[];
  const fromId = identifierValue(p, SYSTEMS.role).split(",").filter(Boolean) as RoleId[];
  const roles = [...new Set([...fromRoles, ...fromId])];
  return roles.length ? roles : ["doctor"];
}

export function mapStaff(p: FhirResource, roles: FhirResource[]): StaffMember {
  const login =
    identifierValue(p, SYSTEMS.login) ||
    ((p.telecom as { system?: string; value?: string }[]) || []).find((t) => t.system === "email")?.value ||
    p.id ||
    "";
  const memberRoles = rolesFromPractitioner(p, roles);
  return {
    id: p.id || "",
    name: displayName(p),
    login,
    email: ((p.telecom as { system?: string; value?: string }[]) || []).find((t) => t.system === "email")?.value || login,
    roles: memberRoles,
    primaryRole: memberRoles[0],
    resource: p,
  };
}

export async function listStaff(): Promise<StaffMember[]> {
  const [practitioners, roles] = await Promise.all([
    fhirSearch("Practitioner"),
    fhirSearch("PractitionerRole"),
  ]);
  return practitioners.map((p) => mapStaff(p, roles));
}

export async function ensureBootstrapStaff(): Promise<StaffMember[]> {
  const existing = await listStaff();
  const ivan = existing.find(
    (s) => s.login.toLowerCase() === "ivan" || s.email.toLowerCase() === "ivan_renteria@integramed.com",
  );
  if (ivan) return existing;
  const practitioner = await fhirCreate({
    resourceType: "Practitioner",
    active: true,
    name: [{ use: "official", family: "Renteria", given: ["Ivan"], prefix: ["Lic."] }],
    telecom: [{ system: "email", value: "ivan_renteria@integramed.com" }],
    identifier: [
      { system: SYSTEMS.login, value: "ivan" },
      { system: SYSTEMS.role, value: "admin,therapist" },
    ],
  });
  try {
    await fhirCreate({
      resourceType: "PractitionerRole",
      active: true,
      practitioner: { reference: `Practitioner/${practitioner.id}` },
      code: [{ coding: [{ system: SYSTEMS.role, code: "admin", display: "Administración" }] }],
    });
  } catch {
    // Role is optional if the server rejects PractitionerRole
  }
  const created = mapStaff(practitioner, []);
  if (!created.login) created.login = "ivan";
  return [...existing, created];
}

export async function upsertStaff(input: {
  id?: string;
  given: string;
  family: string;
  login: string;
  email: string;
  roles: RoleId[];
  prefix?: string;
}) {
  const resource: FhirResource = {
    resourceType: "Practitioner",
    ...(input.id ? { id: input.id } : {}),
    active: true,
    name: [{ use: "official", family: input.family, given: input.given.split(" "), prefix: input.prefix ? [input.prefix] : [] }],
    telecom: input.email ? [{ system: "email", value: input.email }] : [],
    identifier: [
      { system: SYSTEMS.login, value: input.login.trim().toLowerCase() },
      { system: SYSTEMS.role, value: input.roles.join(",") },
    ],
  };
  const saved = input.id ? await fhirUpdate(resource) : await fhirCreate(resource);
  const roles = await fhirSearch("PractitionerRole", { practitioner: `Practitioner/${saved.id}` });
  if (roles[0]) {
    await fhirUpdate({
      ...roles[0],
      code: input.roles.map((code) => ({ coding: [{ system: SYSTEMS.role, code }] })),
    });
  } else {
    await fhirCreate({
      resourceType: "PractitionerRole",
      active: true,
      practitioner: { reference: `Practitioner/${saved.id}` },
      code: input.roles.map((code) => ({ coding: [{ system: SYSTEMS.role, code }] })),
    });
  }
  return saved;
}
