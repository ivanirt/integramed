import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";
import { verifySessionToken } from "../server/sessionAuth.js";
import { SYSTEMS } from "../src/lib/roles.ts";
import {
  YESHUA_ID,
  YESHUA_ORG_ID,
  YESHUA_SERVICES,
  YESHUA_SITE_ID,
  YESHUA_STAFF,
  createSeedFhirClient,
  proxyOriginFromEnv,
  seedClinicaYeshua,
  seedProxyHeaders,
  yeshuaServiceId,
  type FhirClient,
  type FhirResource,
} from "./seed-yeshua.ts";

const SECRET = "should-not-persist";
const SESSION_SECRET = "s".repeat(48);
const FHIR_PROXY_SECRET = "p".repeat(48);

function identifierValue(resource: FhirResource | undefined, system: string) {
  const ids = (resource?.identifier as { system?: string; value?: string }[]) || [];
  return ids.find((id) => id.system === system)?.value || "";
}

function listen(handler: http.RequestListener) {
  return new Promise<http.Server>((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function stop(server: http.Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function createMemoryFhir(seed: FhirResource[] = []): FhirClient & { all(type: string): FhirResource[]; writes: FhirResource[] } {
  const buckets = new Map<string, FhirResource[]>();
  const writes: FhirResource[] = [];
  let seq = 0;
  for (const resource of seed) {
    const copy = structuredClone(resource);
    if (!copy.id) copy.id = `seed-${++seq}`;
    const list = buckets.get(copy.resourceType) || [];
    list.push(copy);
    buckets.set(copy.resourceType, list);
  }
  const list = (type: string) => buckets.get(type) || [];
  return {
    writes,
    all(type: string) {
      return list(type).map((resource) => structuredClone(resource));
    },
    async search(type: string) {
      return list(type).map((resource) => structuredClone(resource));
    },
    async create(resource: FhirResource) {
      writes.push(structuredClone(resource));
      const saved = { ...structuredClone(resource), id: `gen-${++seq}` };
      buckets.set(resource.resourceType, [...list(resource.resourceType), saved]);
      return structuredClone(saved);
    },
    async update(resource: FhirResource) {
      writes.push(structuredClone(resource));
      if (!resource.id) throw new Error("id required");
      const items = list(resource.resourceType);
      const index = items.findIndex((item) => item.id === resource.id);
      if (index < 0) throw new Error(`missing ${resource.resourceType}/${resource.id}`);
      const saved = structuredClone(resource);
      const next = [...items];
      next[index] = saved;
      buckets.set(resource.resourceType, next);
      return structuredClone(saved);
    },
  };
}

function byIdentifier(resources: FhirResource[], system: string, value: string) {
  const found = resources.find((resource) => identifierValue(resource, system) === value);
  assert.ok(found, `missing ${system}|${value}`);
  return found;
}

function assertClean(resources: FhirResource[]) {
  const raw = JSON.stringify(resources);
  assert.equal(raw.includes(SECRET), false);
  assert.equal(/"password"\s*:/.test(raw), false);
  assert.equal(/"aiApiKey"\s*:/.test(raw), false);
}

describe("yeshua service ids", () => {
  it("keeps the historical slug, including accented names", () => {
    assert.equal(yeshuaServiceId("Consulta general"), "serv-yeshua-consulta-general");
    assert.equal(yeshuaServiceId("Consulta homeopatía"), "serv-yeshua-consulta-homeopat-a");
    assert.equal(yeshuaServiceId("Curación heridas"), "serv-yeshua-curaci-n-heridas");
    assert.equal(yeshuaServiceId("Terapia Regenerativa Células Madre"), "serv-yeshua-terapia-regenerativa-c-lulas-madre");
  });
});

describe("seedClinicaYeshua", () => {
  it("creates the clinic once and updates it on the next run", async () => {
    const fhir = createMemoryFhir();
    const first = await seedClinicaYeshua(fhir);
    assert.equal(first.created, 22);
    assert.equal(first.updated, 0);
    assert.equal(fhir.all("Organization").length, 1);
    assert.equal(fhir.all("Location").length, 5);
    assert.equal(fhir.all("HealthcareService").length, 6);
    assert.equal(fhir.all("Practitioner").length, 5);
    assert.equal(fhir.all("PractitionerRole").length, 5);

    const second = await seedClinicaYeshua(fhir);
    assert.equal(second.created, 0);
    assert.equal(second.updated, 22);
    assert.equal(second.organizationId, first.organizationId);
    assert.deepEqual(second.locationIds, first.locationIds);
    assert.deepEqual(second.serviceIds, first.serviceIds);
    assert.deepEqual(second.staffIds, first.staffIds);
    assert.equal(fhir.all("Organization").length, 1);
    assert.equal(fhir.all("Location").length, 5);
    assert.equal(fhir.all("HealthcareService").length, 6);
    assert.equal(fhir.all("Practitioner").length, 5);
    assert.equal(fhir.all("PractitionerRole").length, 5);
    assertClean(fhir.writes);
    assertClean([
      ...fhir.all("Organization"),
      ...fhir.all("Location"),
      ...fhir.all("HealthcareService"),
      ...fhir.all("Practitioner"),
      ...fhir.all("PractitionerRole"),
    ]);
  });

  it("links rooms, services and staff without storing a secret", async () => {
    const fhir = createMemoryFhir();
    const result = await seedClinicaYeshua(fhir);
    const org = byIdentifier(fhir.all("Organization"), YESHUA_ID.organization, YESHUA_ORG_ID);
    assert.equal(org.id, result.organizationId);
    assert.equal(org.name, "Clínica Yeshua");
    const address = (org.address as { city?: string; line?: string[] }[])[0];
    assert.equal(address.city, "Naucalpan de Juárez");
    assert.match(address.line?.[0] || "", /Av\. México 46/);

    const site = byIdentifier(fhir.all("Location"), YESHUA_ID.location, YESHUA_SITE_ID);
    assert.equal(identifierValue(site, YESHUA_ID.locationCode), "YESHUA-NAU");
    const room = byIdentifier(fhir.all("Location"), YESHUA_ID.location, "loc-yeshua-consultorio-1");
    assert.equal((room.partOf as { reference?: string }).reference, `Location/${site.id}`);
    assert.equal((room.managingOrganization as { reference?: string }).reference, `Organization/${org.id}`);

    const homeopathy = byIdentifier(fhir.all("HealthcareService"), YESHUA_ID.healthcareService, yeshuaServiceId("Consulta homeopatía"));
    const homeopathyRefs = ((homeopathy.location as { reference?: string }[]) || []).map((item) => item.reference);
    assert.deepEqual(homeopathyRefs.sort(), [
      `Location/${result.locationIds["loc-yeshua-consultorio-1"]}`,
      `Location/${result.locationIds["loc-yeshua-consultorio-2"]}`,
    ].sort());

    for (const member of YESHUA_STAFF) {
      const person = byIdentifier(fhir.all("Practitioner"), YESHUA_ID.practitioner, member.id);
      const email = ((person.telecom as { system?: string; value?: string }[]) || []).find((item) => item.system === "email");
      assert.equal(email?.value, member.email);
      assert.equal(person.gender, member.gender);
      const role = fhir.all("PractitionerRole").find((item) => (item.practitioner as { reference?: string }).reference === `Practitioner/${person.id}`);
      assert.ok(role);
      assert.equal((role.organization as { reference?: string }).reference, `Organization/${org.id}`);
      assert.equal((role.location as { reference?: string }[])[0]?.reference, `Location/${result.locationIds[member.locationId]}`);
    }

    const jesus = byIdentifier(fhir.all("Practitioner"), YESHUA_ID.practitioner, "staff-jesus-robledo");
    assert.equal(identifierValue(jesus, SYSTEMS.role), "doctor,admin");
    assert.equal(YESHUA_SERVICES.length, 6);
  });

  it("reuses an organization matched by name and city and keeps its address", async () => {
    const fhir = createMemoryFhir([
      {
        resourceType: "Organization",
        id: "existing-org",
        name: "Clínica Yeshua",
        address: [{ city: "Naucalpan de Juárez", line: ["Calle ya capturada 9"] }],
      },
    ]);
    const result = await seedClinicaYeshua(fhir);
    assert.equal(result.organizationId, "existing-org");
    assert.equal(fhir.all("Organization").length, 1);
    const org = fhir.all("Organization")[0];
    assert.equal(identifierValue(org, YESHUA_ID.organization), YESHUA_ORG_ID);
    assert.equal((org.address as { line?: string[] }[])[0]?.line?.[0], "Calle ya capturada 9");
  });

  it("reuses a practitioner by email, keeps the login and drops secrets", async () => {
    const fhir = createMemoryFhir([
      {
        resourceType: "Practitioner",
        id: "existing-ivan",
        active: true,
        name: [{ use: "official", family: "Renteria", given: ["Ivan"], text: "Ivan Renteria" }],
        telecom: [{ system: "email", value: "ivan_renteria@integramed.com" }],
        identifier: [
          { system: SYSTEMS.login, value: "ivan" },
          { system: SYSTEMS.role, value: "admin,therapist" },
        ],
        password: SECRET,
        extension: [
          {
            url: "https://integramed.app/fhir/StructureDefinition/app-payload",
            valueString: JSON.stringify({ password: SECRET, note: "keep-me" }),
          },
        ],
      },
      {
        resourceType: "PractitionerRole",
        id: "existing-admin-role",
        active: true,
        practitioner: { reference: "Practitioner/existing-ivan" },
        code: [{ coding: [{ system: SYSTEMS.role, code: "admin", display: "Administración" }] }],
      },
    ]);

    const first = await seedClinicaYeshua(fhir);
    assert.equal(first.staffIds["staff-ivan-renteria"], "existing-ivan");
    assert.equal(fhir.all("Practitioner").length, 5);
    const ivan = fhir.all("Practitioner").find((person) => person.id === "existing-ivan");
    assert.ok(ivan);
    assert.equal(identifierValue(ivan, SYSTEMS.login), "ivan");
    assert.equal(identifierValue(ivan, SYSTEMS.role), "admin,therapist");
    assert.equal(identifierValue(ivan, YESHUA_ID.practitioner), "staff-ivan-renteria");
    const payload = ((ivan.extension as { valueString?: string }[]) || [])[0]?.valueString || "";
    assert.equal(payload.includes(SECRET), false);
    assert.match(payload, /keep-me/);

    const roles = fhir.all("PractitionerRole").filter((role) => (role.practitioner as { reference?: string }).reference === "Practitioner/existing-ivan");
    assert.equal(roles.length, 2);
    assert.equal(roles.filter((role) => (role.organization as { reference?: string } | undefined)?.reference).length, 1);
    assertClean(fhir.writes);

    const second = await seedClinicaYeshua(fhir);
    assert.equal(second.created, 0);
    assert.equal(fhir.all("Practitioner").length, 5);
    assert.equal(
      fhir.all("PractitionerRole").filter((role) => (role.practitioner as { reference?: string }).reference === "Practitioner/existing-ivan").length,
      2,
    );
  });
});

describe("seed proxy auth", () => {
  it("signs a short-lived admin session and refuses a non-loopback proxy", () => {
    const headers = seedProxyHeaders({ NODE_ENV: "test", SESSION_SECRET, FHIR_PROXY_SECRET });
    assert.equal(headers["x-integramed-proxy-secret"], FHIR_PROXY_SECRET);
    const token = headers.cookie.slice("integramed_session=".length);
    const user = verifySessionToken(token, SESSION_SECRET);
    assert.ok(user);
    assert.equal(user.role, "admin");
    assert.equal(user.login, "seed-yeshua");
    assert.ok(user.exp > Date.now());
    assert.ok(user.exp - Date.now() <= 10 * 60 * 1000);
    assert.throws(() => seedProxyHeaders({ NODE_ENV: "test", SESSION_SECRET: "short", FHIR_PROXY_SECRET }));
    assert.throws(() => proxyOriginFromEnv("https://fhir.example.test/fhir"));
    assert.equal(proxyOriginFromEnv("http://127.0.0.1:3001"), "http://127.0.0.1:3001");
  });

  it("writes the clinic through the authenticated proxy and does not duplicate it", async () => {
    process.env.SESSION_SECRET = SESSION_SECRET;
    process.env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
    process.env.FHIR_MODE = "local";
    process.env.FHIR_PROXY_NO_LISTEN = "1";
    process.env.CLINICAL_AI_KEY = "";
    const { app } = await import("../server/index.js");
    const server = await listen(app);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing port");
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      const open = await fetch(`${origin}/api/fhir/Organization`);
      assert.equal(open.status, 401);
      const client = createSeedFhirClient({
        ...process.env,
        FHIR_PROXY_URL: origin,
        SESSION_SECRET,
        FHIR_PROXY_SECRET,
      });
      const first = await seedClinicaYeshua(client);
      const second = await seedClinicaYeshua(client);
      assert.equal(first.created + first.updated, 22);
      assert.equal(second.created, 0);
      assert.equal(second.updated, 22);
      const orgs = await client.search("Organization");
      assert.equal(orgs.filter((org) => identifierValue(org, YESHUA_ID.organization) === YESHUA_ORG_ID).length, 1);
    } finally {
      await stop(server);
    }
  });
});
