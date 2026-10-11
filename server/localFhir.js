import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FHIR_RESOURCE_TYPES, parseBundleEntry, parseFhirTarget } from '../src/lib/fhir-path.js';
import { defaultFhirStorageRoot } from '../src/lib/fhir-root.js';

const RESOURCE_TYPES = FHIR_RESOURCE_TYPES;

function nowInstant() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function outcome(severity, code, diagnostics, status = 400) {
  return {
    status,
    headers: { 'Content-Type': 'application/fhir+json' },
    body: {
      resourceType: 'OperationOutcome',
      issue: [{ severity, code, diagnostics }]
    }
  };
}

function json(status, body, extraHeaders = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/fhir+json', ...extraHeaders },
    body
  };
}

export function createLocalFhirStore(projectRoot) {
  const dataDir = defaultFhirStorageRoot(projectRoot);

  function typeDir(type) {
    return path.join(dataDir, type);
  }

  function ensureType(type) {
    fs.mkdirSync(typeDir(type), { recursive: true });
  }

  function fileFor(type, id) {
    return path.join(typeDir(type), `${id}.json`);
  }

  function readResource(type, id) {
    const file = fileFor(type, id);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function writeResource(resource) {
    ensureType(resource.resourceType);
    const next = {
      ...resource,
      meta: {
        ...(resource.meta || {}),
        lastUpdated: nowInstant(),
        versionId: String(Number(resource.meta?.versionId || 0) + 1)
      }
    };
    fs.writeFileSync(fileFor(resource.resourceType, resource.id), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
  }

  function deleteResource(type, id) {
    const file = fileFor(type, id);
    if (!fs.existsSync(file)) return false;
    fs.unlinkSync(file);
    return true;
  }

  function listType(type) {
    const dir = typeDir(type);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    // An existing root-owned volume throws EACCES here. Startup probes the
    // directory and exits with the chown hint instead of crashing on import.
    if (err?.code !== 'EACCES' && err?.code !== 'EPERM') throw err;
  }

  return { readResource, writeResource, deleteResource, listType, dataDir };
}

function resourceText(resource) {
  const names = [];
  const pushName = (n) => {
    if (!n) return;
    if (typeof n === 'string') names.push(n);
    else names.push([...(n.prefix || []), ...(n.given || []), n.family, n.text].filter(Boolean).join(' '));
  };
  if (Array.isArray(resource.name)) resource.name.forEach(pushName);
  else pushName(resource.name);
  if (resource.title) names.push(resource.title);
  (resource.identifier || []).forEach((id) => {
    if (id?.value) names.push(id.value);
  });
  return names.join(' ').toLowerCase();
}

function refId(value) {
  return String(value || '').replace(/^.*\//, '');
}

function resourceDate(resource) {
  return resource.effectiveDateTime
    || resource.issued
    || resource.date
    || resource.authoredOn
    || resource.period?.start
    || resource.onsetDateTime
    || resource.meta?.lastUpdated
    || '';
}

function matchesQuery(resource, query) {
  if (query._id && resource.id !== query._id) return false;
  if (query.name && !resourceText(resource).includes(String(query.name).toLowerCase())) return false;
  if (query.identifier) {
    const raw = String(query.identifier);
    const pipe = raw.indexOf('|');
    const system = pipe >= 0 ? raw.slice(0, pipe) : '';
    const value = pipe >= 0 ? raw.slice(pipe + 1) : raw;
    const ids = resource.identifier || [];
    const matched = ids.some((id) => {
      if (system && value) return id.system === system && String(id.value) === value;
      return String(id.value || '') === value || String(id.value || '').toLowerCase().includes(value.toLowerCase());
    });
    if (!matched && !resourceText(resource).includes(value.toLowerCase())) return false;
    if (!matched) return false;
  }
  if (query.gender && resource.gender !== query.gender) return false;
  const patient = query.patient || query.subject;
  if (patient) {
    const pid = refId(patient);
    const refs = [
      resource.subject?.reference,
      resource.patient?.reference,
      ...(resource.participant || []).map((p) => p.actor?.reference),
      ...(resource.actor || []).map((a) => a.reference)
    ].filter(Boolean).map(refId);
    if (resource.resourceType === 'Patient') {
      if (resource.id !== pid) return false;
    } else if (!refs.includes(pid)) {
      return false;
    }
  }
  if (query.code) {
    const wanted = String(query.code).split(',').map((c) => c.trim()).filter(Boolean);
    const codes = [
      ...(resource.code?.coding || []).map((c) => c.code),
      resource.code?.text,
      ...(resource.component || []).flatMap((comp) => (comp.code?.coding || []).map((c) => c.code))
    ].filter(Boolean);
    if (wanted.length && !wanted.some((code) => codes.includes(code))) return false;
  }
  if (query.category) {
    const cats = (resource.category || []).flatMap((cat) => [
      cat.text,
      ...(cat.coding || []).map((c) => c.code)
    ]).filter(Boolean);
    if (!cats.map(String).includes(String(query.category))) return false;
  }
  if (query.status && resource.status !== query.status) return false;
  return true;
}

function capabilityStatement(baseUrl) {
  return {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: nowInstant(),
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['application/fhir+json', 'application/json'],
    software: { name: 'IntegraMed Local FHIR', version: '1.0.0' },
    implementation: { description: 'IntegraMed in-process FHIR R4 server', url: baseUrl },
    rest: [{
      mode: 'server',
      resource: RESOURCE_TYPES.map((type) => ({
        type,
        interaction: [
          { code: 'read' },
          { code: 'search-type' },
          { code: 'create' },
          { code: 'update' },
          { code: 'delete' }
        ],
        searchParam: [
          { name: '_id', type: 'token' },
          { name: 'name', type: 'string' },
          { name: 'patient', type: 'reference' },
          { name: 'subject', type: 'reference' },
          { name: 'code', type: 'token' },
          { name: 'category', type: 'token' },
          { name: 'status', type: 'token' },
          { name: '_count', type: 'number' },
          { name: '_sort', type: 'string' }
        ]
      }))
    }]
  };
}

export function createLocalFhirHandler(projectRoot, { publicBaseUrl } = {}) {
  const store = createLocalFhirStore(projectRoot);
  const baseUrl = publicBaseUrl || 'http://localhost:3001/fhir';

  function search(type, query) {
    let items = store.listType(type).filter((resource) => matchesQuery(resource, query));
    const sort = query._sort;
    if (sort) {
      const desc = String(sort).startsWith('-');
      items.sort((a, b) => {
        const da = resourceDate(a);
        const db = resourceDate(b);
        return desc ? String(db).localeCompare(String(da)) : String(da).localeCompare(String(db));
      });
    }
    const total = items.length;
    if (query._summary === 'count') {
      return json(200, { resourceType: 'Bundle', type: 'searchset', total, entry: [] });
    }
    const count = Math.min(Math.max(Number(query._count || 50) || 50, 1), 500);
    const offsetRaw = Number(query._offset || 0);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const pageItems = items.slice(offset, offset + count);
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: pageItems.map((resource) => ({
        fullUrl: `${baseUrl}/${resource.resourceType}/${resource.id}`,
        resource
      }))
    };
    if (offset + pageItems.length < total) {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (key === '_offset' || key === '_summary') continue;
        next.set(key, String(value));
      }
      next.set('_count', String(count));
      next.set('_offset', String(offset + pageItems.length));
      bundle.link = [{ relation: 'next', url: `${baseUrl}/${type}?${next}` }];
    }
    return json(200, bundle);
  }

  function create(type, body) {
    if (!body || typeof body !== 'object') return outcome('error', 'invalid', 'JSON body required');
    const resourceType = body.resourceType || type;
    if (type && resourceType !== type) {
      return outcome('error', 'invalid', `resourceType must be ${type}`);
    }
    const resource = writeCreated({ ...body, resourceType });
    return json(201, resource, { Location: `${baseUrl}/${resource.resourceType}/${resource.id}` });
  }

  function writeCreated(body) {
    const id = body.id || newId();
    return store.writeResource({ ...body, id });
  }

  function handleTransaction(bundle) {
    const type = String(bundle?.type || '').toLowerCase();
    if (bundle?.resourceType !== 'Bundle' || (type !== 'transaction' && type !== 'batch') || !Array.isArray(bundle.entry)) {
      return outcome('error', 'invalid', 'Bundle type must be transaction or batch', 400);
    }
    const prepared = [];
    for (const item of bundle.entry) {
      const entry = parseBundleEntry(item);
      if (!entry.ok) return outcome('error', 'invalid', 'URL de entrada no válida', 400);
      prepared.push(entry);
    }
    const entry = prepared.map((parsedEntry, index) => {
      const item = bundle.entry[index];
      const target = [parsedEntry.parsed.rawType, parsedEntry.parsed.id, ...parsedEntry.parsed.extra]
        .filter((part) => part)
        .join('/');
      const result = handleFhirRequest(parsedEntry.method, target, {}, item.resource);
      return {
        response: {
          status: String(result.status),
          location: result.headers?.Location
        },
        resource: result.body?.resourceType ? result.body : undefined
      };
    });
    return json(200, { resourceType: 'Bundle', type: 'transaction-response', entry });
  }

  function handleFhirRequest(method, rawPath, query = {}, body) {
    try {
      return dispatchFhirRequest(method, rawPath, query, body);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'FHIR store failure';
      console.error('[FHIR] local store request failed:', detail);
      return outcome('error', 'exception', 'No se pudo completar la operación FHIR local.', 500);
    }
  }

  function dispatchFhirRequest(method, rawPath, query = {}, body) {
    const verb = String(method || 'GET').toUpperCase();
    const parsed = parseFhirTarget(rawPath);
    if (!parsed.ok) return outcome('error', 'invalid', 'URL de FHIR no válida', 400);
    if (verb === 'POST' && parsed.kind === 'base' && body?.resourceType === 'Bundle') {
      return handleTransaction(body);
    }
    if ((parsed.kind === 'base' || parsed.kind === 'metadata') && verb === 'GET') {
      return json(200, capabilityStatement(baseUrl));
    }
    if (parsed.kind !== 'type') {
      return outcome('error', 'not-supported', `${verb} not supported`, 405);
    }
    if (parsed.nonCanonical) {
      return outcome('error', 'not-found', `${parsed.rawType} not found`, 404);
    }
    if (parsed.extra.length) return outcome('error', 'not-supported', 'Operation not supported', 404);

    const type = parsed.canonical || parsed.rawType;
    const id = parsed.id;
    if (!type) return outcome('error', 'not-found', 'Resource type required', 404);

    if (verb === 'GET' && !id) return search(type, query);
    if (verb === 'GET' && id) {
      const resource = store.readResource(type, id);
      if (!resource) return outcome('error', 'not-found', `${type}/${id} not found`, 404);
      return json(200, resource);
    }
    if (verb === 'POST' && !id) return create(type, body);
    if ((verb === 'PUT' || verb === 'PATCH') && id) {
      if (!body || typeof body !== 'object') return outcome('error', 'invalid', 'JSON body required');
      const existing = store.readResource(type, id);
      const resource = store.writeResource({
        ...(existing || {}),
        ...body,
        resourceType: type,
        id
      });
      return json(existing ? 200 : 201, resource);
    }
    if (verb === 'DELETE' && id) {
      const ok = store.deleteResource(type, id);
      if (!ok) return outcome('error', 'not-found', `${type}/${id} not found`, 404);
      return { status: 204, headers: {}, body: null };
    }
    return outcome('error', 'not-supported', `${verb} ${type} not supported`, 405);
  }

  return {
    handleFhirRequest,
    store,
    patientCount() {
      return store.listType('Patient').length;
    }
  };
}

export function sendFhirResult(res, result) {
  Object.entries(result.headers || {}).forEach(([key, value]) => {
    if (value) res.setHeader(key, value);
  });
  if (result.status === 204) return res.status(204).end();
  return res.status(result.status).json(result.body);
}
