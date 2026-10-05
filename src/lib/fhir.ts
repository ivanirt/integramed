import { SYSTEMS } from "./roles";
import { displayName } from "./display-name";
import { fhirProxyHeaders, fhirProxyOrigin } from "./proxy";
import { getSession } from "./session";

export { displayName };

export type FhirResource = {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
};

export type FhirBundle = {
  resourceType: "Bundle";
  total?: number;
  entry?: { resource?: FhirResource }[];
};

export class FhirError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function assertPractitionerWrite(path: string, method: string) {
  const verb = method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(verb)) return;
  const type = path.split("?")[0]?.replace(/^\/+/, "").split("/")[0];
  if (type !== "Practitioner") return;
  const session = await getSession();
  if (session?.role !== "admin") {
    throw new FhirError("Solo administración puede modificar un Practitioner.", 403);
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  await assertPractitionerWrite(path, init.method || "GET");
  const url = `${fhirProxyOrigin()}/api/fhir/${path.replace(/^\//, "")}`;
  const headers = await fhirProxyHeaders({
    Accept: "application/fhir+json, application/json",
    ...(init.headers as Record<string, string> | undefined),
  });
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/fhir+json");
  }
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const fail = data as { issue?: { diagnostics?: string }[]; message?: string };
    const diag = fail?.issue?.[0]?.diagnostics || fail?.message || `FHIR ${res.status}`;
    throw new FhirError(diag, res.status);
  }
  return data;
}

export async function fhirSearch(type: string, params: Record<string, string> = {}): Promise<FhirResource[]> {
  const qs = new URLSearchParams({ _count: "200", ...params });
  const data = (await request(`${type}?${qs}`)) as FhirBundle | FhirResource;
  if (data?.resourceType === type) return [data as FhirResource];
  if (data?.resourceType === "Bundle") {
    const entry = (data as FhirBundle).entry ?? [];
    return entry
      .map((e: { resource?: FhirResource }) => e.resource)
      .filter((r: FhirResource | undefined): r is FhirResource => Boolean(r && r.resourceType === type));
  }
  return [];
}

export async function fhirRead(type: string, id: string) {
  return (await request(`${type}/${encodeURIComponent(id)}`)) as FhirResource;
}

export async function fhirCreate(resource: FhirResource) {
  return (await request(resource.resourceType, {
    method: "POST",
    body: JSON.stringify(resource),
  })) as FhirResource;
}

export async function fhirUpdate(resource: FhirResource) {
  if (!resource.id) throw new Error("Resource id required");
  return (await request(`${resource.resourceType}/${encodeURIComponent(resource.id)}`, {
    method: "PUT",
    body: JSON.stringify(resource),
  })) as FhirResource;
}

export async function fhirDelete(type: string, id: string) {
  await request(`${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function bundleResources(data: FhirBundle | FhirResource | null, type: string) {
  if (!data) return [];
  if (data.resourceType === type) return [data as FhirResource];
  if (data.resourceType === "Bundle") {
    return ((data as FhirBundle).entry || [])
      .map((e) => e.resource)
      .filter((r): r is FhirResource => Boolean(r && r.resourceType === type));
  }
  return [];
}

export function identifierValue(resource: FhirResource | undefined, system: string) {
  const ids = (resource?.identifier as { system?: string; value?: string }[]) || [];
  return ids.find((i) => i.system === system)?.value || "";
}

export function readExtension(resource: FhirResource | undefined, url: string) {
  const ext = ((resource?.extension as { url?: string; valueString?: string }[]) || []).find(
    (e) => e.url === url,
  );
  if (!ext?.valueString) return null;
  try {
    return JSON.parse(ext.valueString);
  } catch {
    return ext.valueString;
  }
}

export function withExtension(resource: FhirResource, url: string, value: unknown): FhirResource {
  const rest = ((resource.extension as { url?: string }[]) || []).filter((e) => e.url !== url);
  return {
    ...resource,
    extension: [...rest, { url, valueString: typeof value === "string" ? value : JSON.stringify(value) }],
  };
}

export function patientLabel(p: FhirResource) {
  return displayName(p);
}

export { SYSTEMS };
