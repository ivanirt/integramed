/**
 * Idempotent FHIR seed for Clínica Yeshua (Naucalpan).
 *
 * Writes Organization, Location, HealthcareService, Practitioner and
 * PractitionerRole through the app proxy (`FHIR_PROXY_URL`, default
 * http://localhost:3001). Re-running updates the same records.
 * Staff entries carry name, email and role only — no passwords.
 *
 * Usage: npm run seed:yeshua
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { fhirCreate, fhirSearch, fhirUpdate, identifierValue, type FhirResource } from "../src/lib/fhir";
import { ROLE_LABELS, SYSTEMS, type RoleId } from "../src/lib/roles";

export const YESHUA_ORG_ID = "org-clinica-yeshua";
export const YESHUA_SITE_ID = "loc-yeshua-naucalpan";

/** Same identifier systems the clinic already uses for these resource kinds. */
export const YESHUA_ID = {
  organization: "https://integramed.app/fhir/id/organization",
  location: "https://integramed.app/fhir/id/location",
  locationCode: "https://integramed.app/fhir/id/location-code",
  practitioner: "https://integramed.app/fhir/id/practitioner",
  practitionerRole: "https://integramed.app/fhir/id/practitioner-role",
  healthcareService: "https://integramed.app/fhir/catalog/healthcare-service",
} as const;

const LOCATION_SERVICES_URL = "https://integramed.app/fhir/StructureDefinition/location-services";
const SECRET_KEYS = new Set(["password", "newPassword", "lastPasswordChange", "aiApiKey"]);

const ADDRESS = {
  line: "Oficinas Naucalpan LC Corporativo, Av. México 46, piso 2",
  district: "Fraccionamiento las Américas",
  city: "Naucalpan de Juárez",
  state: "Estado de México",
  postalCode: "53040",
  country: "México",
};

export const YESHUA_SERVICES = [
  "Consulta general",
  "Consulta homeopatía",
  "Consulta fisioterapia",
  "Curación heridas",
  "Terapia Ozono",
  "Terapia Regenerativa Células Madre",
] as const;

const AREAS = [
  {
    id: "loc-yeshua-consultorio-1",
    name: "Consultorio 1",
    areaType: "consultation",
    typeName: "Consultorio",
    services: ["Consulta general", "Consulta homeopatía", "Terapia Ozono", "Terapia Regenerativa Células Madre"],
  },
  {
    id: "loc-yeshua-consultorio-2",
    name: "Consultorio 2",
    areaType: "consultation",
    typeName: "Consultorio",
    services: ["Consulta homeopatía"],
  },
  {
    id: "loc-yeshua-fisioterapia",
    name: "Consultorio fisioterapia",
    areaType: "therapy",
    typeName: "Terapia",
    services: ["Consulta fisioterapia"],
  },
  {
    id: "loc-yeshua-sala-heridas",
    name: "Sala heridas",
    areaType: "procedure",
    typeName: "Procedimientos",
    services: ["Curación heridas"],
  },
] as const;

export const YESHUA_STAFF = [
  {
    id: "staff-jesus-robledo",
    givenName: "Jesús",
    familyName: "Robledo",
    prefix: "Dr.",
    gender: "male",
    email: "jesus.robledo@integramed.com",
    roles: ["doctor", "admin"],
    specialty: "Consulta general, homeopatía, terapia ozono y medicina regenerativa",
    locationId: "loc-yeshua-consultorio-1",
  },
  {
    id: "staff-lluvia",
    givenName: "Lluvia",
    familyName: "",
    prefix: "Enf.",
    gender: "female",
    email: "lluvia@clinicayeshua.mx",
    roles: ["nurse"],
    specialty: "Enfermería y curación de heridas",
    locationId: "loc-yeshua-sala-heridas",
  },
  {
    id: "staff-edgar",
    givenName: "Edgar",
    familyName: "",
    prefix: "Lic.",
    gender: "male",
    email: "edgar@clinicayeshua.mx",
    roles: ["therapist"],
    specialty: "Fisioterapia",
    locationId: "loc-yeshua-fisioterapia",
  },
  {
    id: "staff-edith-alvarez",
    givenName: "Edith",
    familyName: "Alvarez",
    prefix: "Lic.",
    gender: "female",
    email: "edith.alvarez@clinicayeshua.mx",
    roles: ["receptionist"],
    specialty: "Asistente clínica",
    locationId: YESHUA_SITE_ID,
  },
  {
    id: "staff-ivan-renteria",
    givenName: "Ivan",
    familyName: "Renteria",
    prefix: "Lic.",
    gender: "male",
    email: "ivan_renteria@integramed.com",
    roles: ["therapist"],
    specialty: "Fisioterapia",
    locationId: "loc-yeshua-fisioterapia",
  },
] as const satisfies readonly StaffSeed[];

type StaffSeed = {
  id: string;
  givenName: string;
  familyName: string;
  prefix: string;
  gender: "male" | "female";
  email: string;
  roles: readonly RoleId[];
  specialty: string;
  locationId: string;
};

type Identifier = { system?: string; value?: string };
type Reference = { reference: string; display?: string };

export type FhirClient = {
  search(type: string, params?: Record<string, string>): Promise<FhirResource[]>;
  create(resource: FhirResource): Promise<FhirResource>;
  update(resource: FhirResource): Promise<FhirResource>;
};

export type SeedResult = {
  created: number;
  updated: number;
  byType: Record<string, { created: number; updated: number }>;
  organizationId: string;
  locationIds: Record<string, string>;
  serviceIds: Record<string, string>;
  staffIds: Record<string, string>;
};

/** Legacy slug: accents become hyphens so existing catalog identifiers still match. */
export function yeshuaServiceId(name: string) {
  return `serv-yeshua-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function stripSecrets<T>(value: T): T {
  return stripValue(value) as T;
}

function stripValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stripValue(item));
  if (!value || typeof value !== "object") return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key)) continue;
    if (key === "valueString" && typeof child === "string") {
      next[key] = stripJsonString(child);
    } else {
      next[key] = stripValue(child);
    }
  }
  return next;
}

function stripJsonString(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return text;
    return JSON.stringify(stripValue(parsed));
  } catch {
    return text;
  }
}

function assertNoSecrets(resource: FhirResource) {
  const raw = JSON.stringify(resource);
  if (/"password"\s*:/.test(raw) || /"aiApiKey"\s*:/.test(raw) || /"newPassword"\s*:/.test(raw)) {
    throw new Error(`No se escribe ${resource.resourceType}: el recurso trae un secreto.`);
  }
}

function prepareWrite(resource: FhirResource): FhirResource {
  const copy = stripSecrets(resource);
  delete copy.meta;
  assertNoSecrets(copy);
  return copy;
}

function identifiersOf(resource: FhirResource): Identifier[] {
  const raw = resource.identifier;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is Identifier => Boolean(id && typeof id === "object"));
}

function hasIdentifier(resource: FhirResource, system: string, value: string) {
  return identifiersOf(resource).some((id) => id.system === system && id.value === value);
}

function withIdentifier(resource: FhirResource, system: string, value: string) {
  const ids = identifiersOf(resource);
  if (ids.some((id) => id.system === system && id.value === value)) return ids;
  return [...ids, { system, value }];
}

function readRef(value: unknown) {
  if (!value || typeof value !== "object") return "";
  return String((value as { reference?: string }).reference || "");
}

function linesOf(address: unknown): string[] {
  if (!address || typeof address !== "object") return [];
  if (Array.isArray(address)) return linesOf(address[0]);
  const line = (address as { line?: unknown }).line;
  if (Array.isArray(line)) return line.map(String).filter(Boolean);
  if (typeof line === "string" && line) return [line];
  return [];
}

function orgCity(org: FhirResource) {
  const address = org.address;
  const first = Array.isArray(address) ? address[0] : address;
  if (!first || typeof first !== "object") return "";
  return String((first as { city?: string }).city || "");
}

function isOwnedYeshuaOrg(org: FhirResource) {
  if (hasIdentifier(org, YESHUA_ID.organization, YESHUA_ORG_ID)) return true;
  const city = orgCity(org).toLowerCase();
  return String(org.name || "").toLowerCase() === "clínica yeshua" && city.includes("naucalpan");
}

function filledArray(current: unknown, fallback: unknown) {
  if (Array.isArray(current) && current.length > 0) return current;
  return fallback;
}

function toFhirAddress() {
  return {
    use: "work",
    type: "physical",
    line: [ADDRESS.line],
    city: ADDRESS.city,
    district: ADDRESS.district,
    state: ADDRESS.state,
    postalCode: ADDRESS.postalCode,
    country: ADDRESS.country,
  };
}

function personText(member: StaffSeed) {
  return [member.prefix, member.givenName, member.familyName].filter(Boolean).join(" ");
}

function isRole(value: unknown): value is RoleId {
  return typeof value === "string" && value in ROLE_LABELS;
}

function roleCoding(role: RoleId) {
  return {
    coding: [{ system: SYSTEMS.role, code: role, display: ROLE_LABELS[role] }],
    text: role,
  };
}

function codesOf(resource: FhirResource): RoleId[] {
  const chunks = (resource.code as { coding?: { code?: string }[]; text?: string }[]) || [];
  const found: RoleId[] = [];
  for (const chunk of chunks) {
    for (const coding of chunk.coding || []) {
      if (isRole(coding.code) && !found.includes(coding.code)) found.push(coding.code);
    }
    if (isRole(chunk.text) && !found.includes(chunk.text)) found.push(chunk.text);
  }
  return found;
}

function specialtyTexts(resource: FhirResource) {
  const items = (resource.specialty as { text?: string; coding?: { display?: string }[] }[]) || [];
  const texts: string[] = [];
  for (const item of items) {
    const text = item.text || item.coding?.[0]?.display || "";
    if (text && !texts.includes(text)) texts.push(text);
  }
  return texts;
}

function locationReferences(resource: FhirResource): Reference[] {
  const raw = resource.location;
  if (!Array.isArray(raw)) return [];
  const refs: Reference[] = [];
  for (const item of raw) {
    const reference = readRef(item);
    if (!reference || refs.some((ref) => ref.reference === reference)) continue;
    const display = item && typeof item === "object" ? (item as { display?: string }).display : undefined;
    refs.push(display ? { reference, display } : { reference });
  }
  return refs;
}

function unionRefs(current: Reference[], incoming: Reference[]) {
  const map = new Map<string, Reference>();
  for (const ref of [...current, ...incoming]) map.set(ref.reference, { ...map.get(ref.reference), ...ref });
  return [...map.values()];
}

function serviceNames(resource: FhirResource) {
  const ext = ((resource.extension as { url?: string; valueString?: string }[]) || []).find(
    (item) => item.url === LOCATION_SERVICES_URL,
  );
  if (!ext?.valueString) return [];
  try {
    const parsed = JSON.parse(ext.valueString) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

function withServiceNames(resource: FhirResource, names: readonly string[]) {
  if (!names.length) return resource;
  const rest = ((resource.extension as { url?: string }[]) || []).filter((item) => item.url !== LOCATION_SERVICES_URL);
  return {
    ...resource,
    extension: [...rest, { url: LOCATION_SERVICES_URL, valueString: JSON.stringify([...names]) }],
  };
}

function emailsOf(resource: FhirResource) {
  const telecom = (resource.telecom as { system?: string; value?: string }[]) || [];
  return telecom.filter((item) => item.system === "email" && item.value).map((item) => String(item.value));
}

function hasHumanName(resource: FhirResource) {
  const name = Array.isArray(resource.name) ? resource.name[0] : undefined;
  if (!name || typeof name !== "object") return false;
  const human = name as { text?: string; family?: string; given?: string[] };
  return Boolean(human.text || human.family || (human.given || []).length);
}

function buildOrganization(): FhirResource {
  return {
    resourceType: "Organization",
    identifier: [{ system: YESHUA_ID.organization, value: YESHUA_ORG_ID }],
    active: true,
    name: "Clínica Yeshua",
    alias: ["Clínica Yeshua"],
    type: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/organization-type",
            code: "prov",
            display: "Healthcare Provider",
          },
        ],
        text: "Clínica de servicios médicos",
      },
    ],
    contact: [{ purpose: { text: "director" }, name: { text: "Dr. Jesús Robledo" } }],
    address: [toFhirAddress()],
  };
}

function mergeOrganization(existing: FhirResource, draft: FhirResource): FhirResource {
  const keepAddress = linesOf(existing.address).length > 0;
  return {
    ...existing,
    identifier: withIdentifier(existing, YESHUA_ID.organization, YESHUA_ORG_ID),
    name: existing.name || draft.name,
    alias: filledArray(existing.alias, draft.alias),
    active: existing.active === undefined ? true : existing.active,
    type: filledArray(existing.type, draft.type),
    contact: filledArray(existing.contact, draft.contact),
    address: keepAddress ? existing.address : draft.address,
  };
}

function buildLocation(input: {
  id: string;
  name: string;
  description?: string;
  kind: "site" | "area";
  areaType: string;
  typeName: string;
  services?: readonly string[];
  code?: string;
  org: FhirResource;
  partOf?: FhirResource;
}): FhirResource {
  const identifier: Identifier[] = [{ system: YESHUA_ID.location, value: input.id }];
  if (input.code) identifier.push({ system: YESHUA_ID.locationCode, value: input.code });
  const resource: FhirResource = {
    resourceType: "Location",
    identifier,
    status: "active",
    name: input.name,
    description: input.description,
    mode: "instance",
    physicalType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: input.kind === "site" ? "si" : "ro",
          display: input.kind === "site" ? "Site" : "Room",
        },
      ],
    },
    type: [
      {
        coding: [
          {
            system: "https://integramed.app/fhir/CodeSystem/location-type",
            code: input.areaType,
            display: input.typeName,
          },
        ],
        text: input.typeName,
      },
    ],
    address: toFhirAddress(),
    managingOrganization: { reference: `Organization/${input.org.id}`, display: String(input.org.name || "Clínica Yeshua") },
    partOf: input.partOf?.id
      ? { reference: `Location/${input.partOf.id}`, display: String(input.partOf.name || "") }
      : undefined,
  };
  return withServiceNames(resource, input.services || []);
}

function mergeLocation(existing: FhirResource, draft: FhirResource): FhirResource {
  const names = serviceNames(existing);
  const merged = withServiceNames(
    {
      ...existing,
      identifier: mergePlainIdentifiers(existing, draft),
      status: existing.status || draft.status,
      name: existing.name || draft.name,
      description: existing.description || draft.description,
      mode: existing.mode || draft.mode,
      physicalType: existing.physicalType || draft.physicalType,
      type: filledArray(existing.type, draft.type),
      address: linesOf(existing.address).length ? existing.address : draft.address,
      managingOrganization: readRef(existing.managingOrganization) ? existing.managingOrganization : draft.managingOrganization,
      partOf: readRef(existing.partOf) ? existing.partOf : draft.partOf,
    },
    names.length ? names : serviceNames(draft),
  );
  return merged;
}

function mergePlainIdentifiers(existing: FhirResource, draft: FhirResource) {
  let ids = identifiersOf(existing);
  for (const id of identifiersOf(draft)) {
    if (!id.system || !id.value) continue;
    if (id.system === SYSTEMS.role) continue;
    if (!ids.some((item) => item.system === id.system && item.value === id.value)) {
      ids = [...ids, { system: id.system, value: id.value }];
    }
  }
  return ids;
}

function buildService(name: string, org: FhirResource, locations: FhirResource[]): FhirResource {
  return {
    resourceType: "HealthcareService",
    identifier: [{ system: YESHUA_ID.healthcareService, value: yeshuaServiceId(name) }],
    active: true,
    name,
    comment: name,
    category: [{ text: "consulta_especialidad" }],
    type: [{ text: "Clínica Yeshua" }],
    appointmentRequired: true,
    providedBy: { reference: `Organization/${org.id}`, display: String(org.name || "Clínica Yeshua") },
    location: locations.filter((loc) => loc.id).map((loc) => ({ reference: `Location/${loc.id}`, display: String(loc.name || "") })),
  };
}

function mergeService(existing: FhirResource, draft: FhirResource): FhirResource {
  const location = unionRefs(locationReferences(existing), locationReferences(draft));
  return {
    ...existing,
    identifier: mergePlainIdentifiers(existing, draft),
    active: existing.active === undefined ? true : existing.active,
    name: existing.name || draft.name,
    comment: existing.comment || draft.comment,
    category: filledArray(existing.category, draft.category),
    type: filledArray(existing.type, draft.type),
    appointmentRequired: existing.appointmentRequired === undefined ? draft.appointmentRequired : existing.appointmentRequired,
    providedBy: readRef(existing.providedBy) ? existing.providedBy : draft.providedBy,
    location: location.length ? location : undefined,
  };
}

function buildPractitioner(member: StaffSeed): FhirResource {
  return {
    resourceType: "Practitioner",
    identifier: [
      { system: YESHUA_ID.practitioner, value: member.id },
      { system: SYSTEMS.role, value: member.roles.join(",") },
    ],
    active: true,
    gender: member.gender,
    name: [
      {
        use: "official",
        text: personText(member),
        prefix: member.prefix ? [member.prefix] : undefined,
        given: member.givenName ? [member.givenName] : undefined,
        family: member.familyName || undefined,
      },
    ],
    telecom: [{ system: "email", value: member.email, use: "work" }],
    qualification: [{ code: { text: member.specialty } }],
    communication: [{ coding: [{ system: "urn:ietf:bcp:47", code: "es" }], text: "es" }],
  };
}

function mergeRoleIdentifier(existing: FhirResource, draft: FhirResource) {
  const ids = mergePlainIdentifiers(existing, draft).filter((id) => id.system !== SYSTEMS.role);
  const previous = identifierValue(existing, SYSTEMS.role)
    .split(",")
    .map((item) => item.trim())
    .filter(isRole);
  const incoming = identifierValue(draft, SYSTEMS.role)
    .split(",")
    .map((item) => item.trim())
    .filter(isRole);
  const merged = [...previous];
  for (const role of incoming) {
    if (!merged.includes(role)) merged.push(role);
  }
  if (merged.length) ids.push({ system: SYSTEMS.role, value: merged.join(",") });
  return ids;
}

function mergePractitioner(existing: FhirResource, draft: FhirResource): FhirResource {
  const telecom = emailsOf(existing).length ? existing.telecom : draft.telecom;
  return {
    ...existing,
    identifier: mergeRoleIdentifier(existing, draft),
    active: existing.active === undefined ? true : existing.active,
    gender: existing.gender || draft.gender,
    name: hasHumanName(existing) ? existing.name : draft.name,
    telecom,
    qualification: filledArray(existing.qualification, draft.qualification),
    communication: filledArray(existing.communication, draft.communication),
  };
}

function areaFor(locationId: string) {
  return AREAS.find((area) => area.id === locationId);
}

function buildRole(member: StaffSeed, practitioner: FhirResource, org: FhirResource, location: FhirResource | undefined): FhirResource {
  const area = areaFor(member.locationId);
  const specialties = area?.services?.length ? [...area.services] : member.specialty ? [member.specialty] : [];
  return {
    resourceType: "PractitionerRole",
    identifier: [{ system: YESHUA_ID.practitionerRole, value: `${member.id}@${YESHUA_ORG_ID}` }],
    active: true,
    practitioner: { reference: `Practitioner/${practitioner.id}`, display: personText(member) },
    organization: { reference: `Organization/${org.id}`, display: String(org.name || "Clínica Yeshua") },
    location: location?.id ? [{ reference: `Location/${location.id}`, display: String(location.name || "") }] : undefined,
    code: member.roles.map((role) => roleCoding(role)),
    specialty: specialties.map((text) => ({ text })),
  };
}

function mergeRole(existing: FhirResource, draft: FhirResource): FhirResource {
  const roles = [...codesOf(existing)];
  for (const role of codesOf(draft)) {
    if (!roles.includes(role)) roles.push(role);
  }
  const specialties = [...specialtyTexts(existing)];
  for (const text of specialtyTexts(draft)) {
    if (!specialties.includes(text)) specialties.push(text);
  }
  const location = locationReferences(existing);
  const draftLocation = locationReferences(draft);
  return {
    ...existing,
    identifier: mergePlainIdentifiers(existing, draft),
    active: existing.active === undefined ? true : existing.active,
    practitioner: readRef(existing.practitioner) ? existing.practitioner : draft.practitioner,
    organization: readRef(existing.organization) ? existing.organization : draft.organization,
    location: (location.length ? location : draftLocation) || undefined,
    code: roles.map((role) => roleCoding(role)),
    specialty: specialties.length ? specialties.map((text) => ({ text })) : undefined,
  };
}

function emptyResult(): SeedResult {
  return { created: 0, updated: 0, byType: {}, organizationId: "", locationIds: {}, serviceIds: {}, staffIds: {} };
}

function tally(result: SeedResult, type: string, created: boolean) {
  const bucket = result.byType[type] || { created: 0, updated: 0 };
  if (created) {
    bucket.created += 1;
    result.created += 1;
  } else {
    bucket.updated += 1;
    result.updated += 1;
  }
  result.byType[type] = bucket;
}

async function upsert(
  client: FhirClient,
  draft: FhirResource,
  find: (items: FhirResource[]) => FhirResource | undefined,
  merge: (existing: FhirResource, draft: FhirResource) => FhirResource,
  result: SeedResult,
) {
  const found = find(await client.search(draft.resourceType, { _count: "500" }));
  if (!found) {
    const created = await client.create(prepareWrite(draft));
    tally(result, draft.resourceType, true);
    if (!created.id) throw new Error(`${draft.resourceType} no regresó id.`);
    return created;
  }
  const updated = await client.update(prepareWrite({ ...merge(found, draft), resourceType: draft.resourceType, id: found.id }));
  tally(result, draft.resourceType, false);
  if (!updated.id) throw new Error(`${draft.resourceType}/${found.id} no regresó id.`);
  return updated;
}

export async function seedClinicaYeshua(client: FhirClient): Promise<SeedResult> {
  const result = emptyResult();

  const org = await upsert(client, buildOrganization(), (items) => items.find(isOwnedYeshuaOrg), mergeOrganization, result);
  result.organizationId = org.id || "";

  const site = await upsert(
    client,
    buildLocation({
      id: YESHUA_SITE_ID,
      name: "Oficinas Naucalpan",
      description: "Sede LC Corporativo, piso 2",
      kind: "site",
      areaType: "other",
      typeName: "Sede",
      code: "YESHUA-NAU",
      org,
    }),
    (items) =>
      items.find((loc) => hasIdentifier(loc, YESHUA_ID.location, YESHUA_SITE_ID)) ||
      items.find((loc) => String(loc.name || "") === "Oficinas Naucalpan" && readRef(loc.managingOrganization) === `Organization/${org.id}`),
    mergeLocation,
    result,
  );
  result.locationIds[YESHUA_SITE_ID] = site.id || "";

  const locations: Record<string, FhirResource> = { [YESHUA_SITE_ID]: site };
  for (const area of AREAS) {
    const saved = await upsert(
      client,
      buildLocation({ ...area, kind: "area", org, partOf: site }),
      (items) =>
        items.find((loc) => hasIdentifier(loc, YESHUA_ID.location, area.id)) ||
        items.find((loc) => String(loc.name || "") === area.name && readRef(loc.managingOrganization) === `Organization/${org.id}`),
      mergeLocation,
      result,
    );
    locations[area.id] = saved;
    result.locationIds[area.id] = saved.id || "";
  }

  for (const name of YESHUA_SERVICES) {
    const rooms = AREAS.filter((area) => (area.services as readonly string[]).includes(name)).map((area) => locations[area.id]);
    const saved = await upsert(
      client,
      buildService(name, org, rooms),
      (items) =>
        items.find((svc) => hasIdentifier(svc, YESHUA_ID.healthcareService, yeshuaServiceId(name))) ||
        items.find((svc) => {
          if (String(svc.name || "") !== name) return false;
          const provider = readRef(svc.providedBy);
          return !provider || provider === `Organization/${org.id}`;
        }),
      mergeService,
      result,
    );
    result.serviceIds[yeshuaServiceId(name)] = saved.id || "";
  }

  for (const member of YESHUA_STAFF) {
    const practitioner = await upsert(
      client,
      buildPractitioner(member),
      (items) =>
        items.find((person) => hasIdentifier(person, YESHUA_ID.practitioner, member.id)) ||
        items.find((person) => emailsOf(person).some((email) => email.toLowerCase() === member.email.toLowerCase())),
      mergePractitioner,
      result,
    );
    result.staffIds[member.id] = practitioner.id || "";
    const location = locations[member.locationId];
    await upsert(
      client,
      buildRole(member, practitioner, org, location),
      (items) =>
        items.find(
          (role) =>
            readRef(role.practitioner) === `Practitioner/${practitioner.id}` &&
            readRef(role.organization) === `Organization/${org.id}`,
        ),
      mergeRole,
      result,
    );
  }

  return result;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

async function main() {
  dotenv.config();
  const result = await seedClinicaYeshua({
    search: (type, params) => fhirSearch(type, params),
    create: (resource) => fhirCreate(resource),
    update: (resource) => fhirUpdate(resource),
  });
  console.log("Clínica Yeshua");
  for (const [type, stats] of Object.entries(result.byType)) {
    console.log(`${type} — creados: ${stats.created}, actualizados: ${stats.updated}`);
  }
  console.log("Si el recurso ya existía, se reutilizó. Volver a correr no lo duplica.");
}

if (isDirectRun()) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    console.error("Comprueba que el proxy FHIR esté en marcha (npm run dev:fhir) y que FHIR_PROXY_URL apunte a él.");
    process.exit(1);
  });
}
