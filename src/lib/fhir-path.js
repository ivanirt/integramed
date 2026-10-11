/** Canonical FHIR type names this proxy stores. Wrong casing is not a different type. */
export const FHIR_RESOURCE_TYPES = [
  "Patient",
  "Practitioner",
  "Encounter",
  "Observation",
  "Condition",
  "MedicationRequest",
  "Medication",
  "AllergyIntolerance",
  "DiagnosticReport",
  "DocumentReference",
  "HealthcareService",
  "Organization",
  "Location",
  "Appointment",
  "RelatedPerson",
  "Task",
  "List",
  "Basic",
  "Schedule",
  "Slot",
  "PractitionerRole",
];

const CANONICAL_BY_LOWER = new Map(FHIR_RESOURCE_TYPES.map((type) => [type.toLowerCase(), type]));
const ENTRY_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);

/**
 * One parser for proxy routes and Bundle entry URLs.
 * Strips the origin, leading "./" or "/", and the fhir or api/fhir base,
 * then percent-decodes and reads the resource type. Repeats so an encoded
 * base cannot survive the first pass. The guard and the store both use this.
 */
export function parseFhirTarget(input) {
  if (input == null) return { ok: false };
  let value = String(input).trim();
  if (!value) return { ok: false };

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return { ok: false };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false };
    value = `${url.pathname}${url.search}`;
  }

  const hashAt = value.indexOf("#");
  if (hashAt >= 0) value = value.slice(0, hashAt);
  let query = "";
  const queryAt = value.indexOf("?");
  if (queryAt >= 0) {
    query = value.slice(queryAt + 1);
    value = value.slice(0, queryAt);
  }

  const unwrapped = unwrapFhirPath(value);
  if (unwrapped == null) return { ok: false };
  if (unwrapped === "") {
    return baseResult(query);
  }

  const segments = [];
  for (const part of unwrapped.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") return { ok: false };
    segments.push(part);
  }
  if (segments.length === 0) return baseResult(query);

  const rawType = segments[0];
  if (rawType.toLowerCase() === "metadata") {
    return {
      ok: true,
      kind: "metadata",
      type: "metadata",
      rawType,
      canonical: null,
      nonCanonical: false,
      id: "",
      extra: segments.slice(1),
      query,
    };
  }

  const canonical = CANONICAL_BY_LOWER.get(rawType.toLowerCase()) || null;
  const nonCanonical = Boolean(canonical && rawType !== canonical);
  return {
    ok: true,
    kind: "type",
    type: canonical || rawType,
    rawType,
    canonical,
    nonCanonical,
    id: segments[1] || "",
    extra: segments.slice(2),
    query,
  };
}

function baseResult(query) {
  return {
    ok: true,
    kind: "base",
    type: "",
    rawType: "",
    canonical: null,
    nonCanonical: false,
    id: "",
    extra: [],
    query,
  };
}

function unwrapFhirPath(value) {
  let current = value;
  for (let pass = 0; pass < 8; pass += 1) {
    const stripped = stripFhirBase(current);
    let decoded;
    try {
      decoded = decodeURIComponent(stripped);
    } catch {
      return null;
    }
    if (decoded === current) return stripFhirBase(decoded);
    current = decoded;
  }
  return null;
}

function stripFhirBase(value) {
  let path = value;
  for (;;) {
    if (path.startsWith("/")) {
      path = path.slice(1);
      continue;
    }
    if (path.startsWith("./")) {
      path = path.slice(2);
      continue;
    }
    const lower = path.toLowerCase();
    if (lower.startsWith("api/fhir/")) {
      path = path.slice("api/fhir/".length);
      continue;
    }
    if (lower === "api/fhir") return "";
    if (lower.startsWith("fhir/")) {
      path = path.slice("fhir/".length);
      continue;
    }
    if (lower === "fhir") return "";
    return path;
  }
}

export function isPractitionerTarget(parsed) {
  return Boolean(parsed?.ok && parsed.kind === "type" && String(parsed.rawType || "").toLowerCase() === "practitioner");
}

export function isTransactionBundle(body) {
  if (!body || body.resourceType !== "Bundle" || !Array.isArray(body.entry)) return false;
  const type = String(body.type || "").toLowerCase();
  return type === "transaction" || type === "batch";
}

/** Bundle entry URL, using the same parser as a direct route. No resource body required. */
export function parseBundleEntry(entry) {
  if (!entry || typeof entry !== "object") return { ok: false };
  const method = String(entry.request?.method || "POST").toUpperCase();
  if (!ENTRY_METHODS.has(method)) return { ok: false };
  const urlValue = entry.request?.url;
  const hasUrl = urlValue != null && String(urlValue).trim() !== "";
  const fallback = !hasUrl && entry.resource?.resourceType ? String(entry.resource.resourceType) : "";
  const target = hasUrl ? String(urlValue) : fallback;
  if (!target.trim()) return { ok: false };
  const parsed = parseFhirTarget(target);
  if (!parsed.ok || parsed.kind !== "type") return { ok: false };
  return { ok: true, method, parsed };
}

/** Non-admin bundles: Practitioner writes, and any entry whose URL cannot be parsed. */
export function bundleEntryBlockedForNonAdmin(entry) {
  const parsed = parseBundleEntry(entry);
  if (!parsed.ok) return true;
  if (parsed.method === "GET" || parsed.method === "HEAD") return false;
  return isPractitionerTarget(parsed.parsed);
}

export function isFhirProxyPath(path) {
  const lower = String(path || "").toLowerCase();
  return lower === "/fhir" || lower.startsWith("/fhir/") || lower === "/api/fhir" || lower.startsWith("/api/fhir/");
}

/**
 * True when this request would write a Practitioner, including Bundle entries
 * whose URL normalizes to one. Reads only req.method. X-HTTP-Method-Override is ignored.
 */
export function isPractitionerMutation(req) {
  const method = String(req?.method || "GET").toUpperCase();
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") return false;
  if (!isFhirProxyPath(req?.path)) return false;
  if (isTransactionBundle(req.body)) {
    return req.body.entry.some((entry) => bundleEntryBlockedForNonAdmin(entry));
  }
  const parsed = parseFhirTarget(req.path);
  if (!parsed.ok) return true;
  return isPractitionerTarget(parsed);
}
