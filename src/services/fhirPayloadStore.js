/**
 * Generic IntegraMed FHIR persistence: app objects round-trip via a payload extension.
 * LocalStorage remains an offline cache only.
 */
import { fhirRequest } from './fhirApi.js';

export const APP_PAYLOAD_URL = 'https://integramed.app/fhir/StructureDefinition/app-payload';
export const idSystem = (kind) => `https://integramed.app/fhir/id/${kind}`;

export function attachPayload(resource, payload) {
  const clean = { ...payload };
  delete clean.password;
  delete clean.aiApiKey;
  return {
    ...resource,
    extension: [
      ...(resource.extension || []).filter((e) => e.url !== APP_PAYLOAD_URL),
      { url: APP_PAYLOAD_URL, valueString: JSON.stringify(clean) }
    ]
  };
}

export function readPayload(resource) {
  if (!resource) return null;
  const ext = (resource.extension || []).find((e) => e.url === APP_PAYLOAD_URL);
  if (!ext?.valueString) return null;
  try {
    return { ...JSON.parse(ext.valueString), fhirId: resource.id };
  } catch {
    return null;
  }
}

export async function searchResources(resourceType, params = '_count=200') {
  const qs = params.startsWith('?') ? params : `?${params}`;
  const data = await fhirRequest(`${resourceType}${qs}`);
  if (!data) return [];
  if (data.resourceType === resourceType) return [data];
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map((e) => e.resource).filter((r) => r && r.resourceType === resourceType);
  }
  return [];
}

export async function loadPayloadCollection(resourceType, kind) {
  try {
    const resources = await searchResources(resourceType, '_count=200');
    const mapped = resources.map(readPayload).filter(Boolean);
    const ofKind = mapped.filter((p) => p._kind === kind);
    if (ofKind.length > 0) return ofKind;
    if (mapped.some((p) => p._kind && p._kind !== kind)) return [];
    return mapped;
  } catch (err) {
    console.info(`[FHIR] load ${resourceType}/${kind} skipped:`, err.message);
    return null;
  }
}

export async function upsertPayloadItem({ resourceType, kind, item, buildBase }) {
  const localId = item.id || `${kind}-${Date.now()}`;
  const payload = { ...item, id: localId, _kind: kind };
  delete payload.password;

  const base = buildBase ? buildBase(payload) : {};
  const resource = attachPayload(
    {
      resourceType,
      ...(item.fhirId ? { id: item.fhirId } : {}),
      identifier: [
        {
          system: idSystem(kind),
          value: String(localId)
        }
      ],
      ...base
    },
    payload
  );

  if (item.fhirId) {
    const saved = await fhirRequest(`${resourceType}/${encodeURIComponent(item.fhirId)}`, {
      method: 'PUT',
      body: { ...resource, id: item.fhirId }
    });
    return { ...item, ...payload, fhirId: saved?.id || item.fhirId };
  }

  const created = await fhirRequest(resourceType, { method: 'POST', body: resource });
  return { ...item, ...payload, fhirId: created?.id || item.fhirId };
}

export async function deletePayloadItem(resourceType, fhirId) {
  if (!fhirId) return true;
  try {
    await fhirRequest(`${resourceType}/${encodeURIComponent(fhirId)}`, { method: 'DELETE' });
  } catch (err) {
    console.info(`[FHIR] delete ${resourceType}/${fhirId} skipped:`, err.message);
  }
  return true;
}

/**
 * One FHIR List resource holding a JSON config blob (schedule, holidays, resource types).
 */
export async function loadConfigBlob(kind) {
  try {
    const lists = await searchResources(
      'List',
      `identifier=${encodeURIComponent(idSystem(kind))}|${encodeURIComponent(kind)}&_count=10`
    );
    if (lists.length > 0) {
      const payload = readPayload(lists[0]);
      if (payload?.data !== undefined) {
        return { ...payload, fhirId: lists[0].id };
      }
    }
    const all = await searchResources('List', '_count=50');
    const match = all.find((list) => readPayload(list)?._kind === kind);
    if (match) {
      const payload = readPayload(match);
      return { ...payload, fhirId: match.id };
    }
    return { data: null, fhirId: null };
  } catch (err) {
    console.info(`[FHIR] load config ${kind} skipped:`, err.message);
    return null;
  }
}

export async function saveConfigBlob(kind, data, fhirId) {
  const payload = { id: kind, _kind: kind, data };
  const resource = attachPayload(
    {
      resourceType: 'List',
      ...(fhirId ? { id: fhirId } : {}),
      status: 'current',
      mode: 'working',
      title: `IntegraMed ${kind}`,
      identifier: [{ system: idSystem(kind), value: kind }]
    },
    payload
  );

  if (fhirId) {
    const saved = await fhirRequest(`List/${encodeURIComponent(fhirId)}`, {
      method: 'PUT',
      body: { ...resource, id: fhirId }
    });
    return saved?.id || fhirId;
  }
  const created = await fhirRequest('List', { method: 'POST', body: resource });
  return created?.id;
}

export function preferRemote(remote, local) {
  if (remote === null) return local;
  if (Array.isArray(remote) && remote.length > 0) return remote;
  return local;
}
