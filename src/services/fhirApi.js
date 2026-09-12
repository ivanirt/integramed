/**
 * Client-side FHIR API service that interacts with the backend FHIR Proxy.
 */
import { buildFhirPatientResource } from '../utils/fhirHelper.js';
import {
  hasSoapContent,
  isEmptyEncounter,
  isEmptyMedicationRequest,
  isEmptyDiagnosticReport,
  isEmptyObservation
} from '../utils/clinicalContent.js';

const API_BASE = '/api';

/**
 * Custom Error class for FHIR API interactions with detailed diagnostic info.
 */
export class FhirApiError extends Error {
  constructor(message, status, diagnostics, operationOutcome) {
    super(message);
    this.name = 'FhirApiError';
    this.status = status;
    this.diagnostics = diagnostics;
    this.operationOutcome = operationOutcome;
  }
}

/**
 * Extracts error details from a response.
 */
async function parseErrorResponse(response) {
  let message = `FHIR API request failed with status ${response.status} (${response.statusText})`;
  let diagnostics = '';
  let operationOutcome = null;

  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const data = await response.json();
      if (data.resourceType === 'OperationOutcome' && Array.isArray(data.issue)) {
        operationOutcome = data;
        const issues = data.issue.map(i => i.diagnostics || i.details?.text || i.code).filter(Boolean);
        if (issues.length > 0) {
          diagnostics = issues.join(' | ');
          message = `FHIR Error (${response.status}): ${diagnostics}`;
        }
      } else if (data.message) {
        message = data.message;
      }
    } else {
      const text = await response.text();
      if (text) diagnostics = text;
    }
  } catch {
    // ignore parse error
  }

  return new FhirApiError(message, response.status, diagnostics, operationOutcome);
}

/**
 * Fetch list of patients from FHIR Proxy, with optional name filter.
 */
export async function getPatients(searchQuery = '') {
  let url = `${API_BASE}/fhir/Patient`;
  
  const params = new URLSearchParams();
  if (searchQuery && searchQuery.trim()) {
    params.set('name', searchQuery.trim());
  }
  
  // Sort or specify count if needed
  params.set('_count', '100');
  
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();

  if (data.resourceType === 'Bundle') {
    if (!data.entry || !Array.isArray(data.entry)) {
      return { patients: [], total: 0 };
    }
    const patients = data.entry
      .filter(e => e && e.resource && e.resource.resourceType === 'Patient')
      .map(e => e.resource);
    return {
      patients,
      total: data.total !== undefined ? data.total : patients.length
    };
  }

  if (data.resourceType === 'Patient') {
    return { patients: [data], total: 1 };
  }

  return { patients: [], total: 0 };
}

/**
 * Fetch a single patient by ID.
 */
export async function getPatientById(id) {
  if (!id) throw new Error('Patient ID is required');

  const response = await fetch(`${API_BASE}/fhir/Patient/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Fetch patient observations (vital signs) by LOINC codes.
 */
export async function getPatientObservations(patientId) {
  if (!patientId) throw new Error('Patient ID is required');

  const loincCodes = '8867-4,8310-5,9279-1,59408-5,8302-2,29463-7,39156-5,55284-4,85354-9,8480-6,8462-4';
  const url = `${API_BASE}/fhir/Observation?subject=Patient/${encodeURIComponent(patientId)}&code=${loincCodes}&_count=200&_sort=-date`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map(e => e.resource).filter(r => r && r.resourceType === 'Observation');
  }

  return [];
}

/**
 * Fetch patient conditions.
 */
export async function getPatientConditions(patientId) {
  if (!patientId) throw new Error('Patient ID is required');

  const url = `${API_BASE}/fhir/Condition?patient=${encodeURIComponent(patientId)}&_count=100`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map(e => e.resource).filter(r => r && r.resourceType === 'Condition');
  }

  return [];
}

/**
 * Fetch patient medication requests.
 */
export async function getPatientMedications(patientId) {
  if (!patientId) throw new Error('Patient ID is required');

  const url = `${API_BASE}/fhir/MedicationRequest?patient=${encodeURIComponent(patientId)}&_count=100`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map(e => e.resource).filter(r => r && r.resourceType === 'MedicationRequest');
  }

  return [];
}

export async function getClinicMedicationRequests() {
  const data = await fhirRequest('MedicationRequest?_count=100');
  if (data?.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map((e) => e.resource).filter((r) => r && r.resourceType === 'MedicationRequest');
  }
  return [];
}

/**
 * Create a new FHIR MedicationRequest resource.
 */
export async function createMedicationRequest({
  patientId,
  patientName,
  practitionerId,
  practitionerName,
  medicationName,
  dosage,
  frequency,
  duration,
  route = 'Oral',
  instructions = ''
}) {
  if (!patientId) throw new Error('Patient ID is required');
  if (!String(medicationName || '').trim()) {
    throw new Error('Empty prescriptions are not sent to the FHIR server');
  }

  const medicationResource = {
    resourceType: 'MedicationRequest',
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          display: medicationName
        }
      ],
      text: medicationName
    },
    subject: {
      reference: `Patient/${patientId}`,
      display: patientName
    },
    ...(practitionerId ? {
      requester: {
        reference: `Practitioner/${practitionerId}`,
        display: practitionerName || 'Practitioner'
      }
    } : {}),
    authoredOn: new Date().toISOString(),
    dosageInstruction: [
      {
        text: `Tomar ${dosage || ''} vía ${route || 'Oral'}, ${frequency || ''} durante ${duration || ''}. ${instructions || ''}`.trim(),
        route: {
          text: route || 'Oral'
        }
      }
    ]
  };

  const response = await fetch(`${API_BASE}/fhir/MedicationRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(medicationResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Create a new FHIR Patient resource via POST.
 */
export async function createPatient({ givenName, familyName, gender, birthDate }) {
  const patientResource = buildFhirPatientResource({
    givenName,
    familyName,
    gender,
    birthDate
  });

  const response = await fetch(`${API_BASE}/fhir/Patient`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(patientResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Update an existing FHIR Patient resource via PUT using patient ID.
 */
export async function updatePatient(id, { givenName, familyName, gender, birthDate }, originalResource = null) {
  if (!id) throw new Error('Patient ID is required for update');

  const updatedResource = buildFhirPatientResource({
    id,
    givenName,
    familyName,
    gender,
    birthDate,
    originalResource
  });

  const response = await fetch(`${API_BASE}/fhir/Patient/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(updatedResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Fetch list of practitioners from FHIR Proxy.
 */
export async function getPractitioners() {
  const response = await fetch(`${API_BASE}/fhir/Practitioner?_count=50`, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map(e => e.resource).filter(r => r && r.resourceType === 'Practitioner');
  }

  return [];
}

/**
 * Create a new Practitioner in the FHIR server.
 */
export async function createPractitioner({ prefix = 'Dr.', givenName, familyName, gender = 'unknown', email, phone, qualification }) {
  const givenArray = givenName ? givenName.trim().split(/\s+/).filter(Boolean) : [];

  const practitionerResource = {
    resourceType: 'Practitioner',
    active: true,
    name: [
      {
        use: 'official',
        prefix: prefix ? [prefix] : ['Dr.'],
        family: familyName ? familyName.trim() : '',
        given: givenArray
      }
    ],
    gender: gender || 'unknown',
    telecom: [
      ...(email ? [{ system: 'email', value: email.trim(), use: 'work' }] : []),
      ...(phone ? [{ system: 'phone', value: phone.trim(), use: 'work' }] : [])
    ]
  };

  if (qualification) {
    practitionerResource.qualification = [
      {
        code: {
          text: qualification.trim()
        }
      }
    ];
  }

  const response = await fetch(`${API_BASE}/fhir/Practitioner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(practitionerResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Fetch list of encounters from FHIR Proxy, optionally filtered by patient.
 */
export async function getEncounters(patientId = '') {
  let url = `${API_BASE}/fhir/Encounter?_count=100&_sort=-date`;
  if (patientId) {
    url += `&subject=Patient/${encodeURIComponent(patientId)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map(e => e.resource).filter(r => r && r.resourceType === 'Encounter');
  }

  return [];
}

/**
 * Schedule / Create a new Encounter in the FHIR server.
 */
export async function createEncounter({
  patientId,
  patientName,
  practitionerId,
  practitionerName,
  type = 'General Examination',
  status = 'planned',
  startTime,
  endTime,
  reason = ''
}) {
  if (!patientId) throw new Error('Patient ID is required to schedule an encounter');

  const startIso = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
  const endIso = endTime ? new Date(endTime).toISOString() : new Date(new Date(startIso).getTime() + 30 * 60 * 1000).toISOString();

  const encounterResource = {
    resourceType: 'Encounter',
    status: status || 'planned',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    type: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '162673000',
            display: type
          }
        ],
        text: type
      }
    ],
    subject: {
      reference: `Patient/${patientId}`,
      display: patientName || `Patient ${patientId}`
    },
    participant: practitionerId ? [
      {
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PPRF',
                display: 'primary performer'
              }
            ]
          }
        ],
        individual: {
          reference: `Practitioner/${practitionerId}`,
          display: practitionerName || `Practitioner ${practitionerId}`
        }
      }
    ] : [],
    period: {
      start: startIso,
      end: endIso
    },
    reasonCode: reason ? [
      {
        text: reason
      }
    ] : []
  };

  const response = await fetch(`${API_BASE}/fhir/Encounter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(encounterResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Update an existing Encounter in the FHIR server via PUT.
 */
export async function updateEncounter(id, encounterData) {
  if (!id) throw new Error('Encounter ID is required for update');

  const startIso = encounterData.startTime
    ? new Date(encounterData.startTime).toISOString()
    : encounterData.date && encounterData.time
    ? new Date(`${encounterData.date}T${encounterData.time}:00`).toISOString()
    : new Date().toISOString();

  const endIso = encounterData.endTime
    ? new Date(encounterData.endTime).toISOString()
    : new Date(new Date(startIso).getTime() + 30 * 60 * 1000).toISOString();

  const encounterResource = {
    resourceType: 'Encounter',
    id,
    status: encounterData.status || 'planned',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    type: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '162673000',
            display: encounterData.type || 'General Examination'
          }
        ],
        text: encounterData.type || 'General Examination'
      }
    ],
    subject: {
      reference: `Patient/${encounterData.patientId || ''}`,
      display: encounterData.patientName || `Patient ${encounterData.patientId || ''}`
    },
    participant: encounterData.practitionerId || encounterData.practitionerName ? [
      {
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PPRF',
                display: 'primary performer'
              }
            ]
          }
        ],
        individual: {
          reference: encounterData.practitionerId ? `Practitioner/${encounterData.practitionerId}` : undefined,
          display: encounterData.practitionerName || 'Practitioner'
        }
      }
    ] : [],
    period: {
      start: startIso,
      end: endIso
    },
    reasonCode: encounterData.reason ? [
      {
        text: encounterData.reason
      }
    ] : []
  };

  const response = await fetch(`${API_BASE}/fhir/Encounter/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(encounterResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

/**
 * Delete / Cancel an Encounter in the FHIR server.
 */
export async function deleteEncounter(id) {
  if (!id) throw new Error('Encounter ID is required for deletion');

  const response = await fetch(`${API_BASE}/fhir/Encounter/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return true;
}

/**
 * Delete a FHIR Patient resource.
 */
export async function deletePatient(id) {
  if (!id) throw new Error('Patient ID is required for deletion');

  const response = await fetch(`${API_BASE}/fhir/Patient/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return true;
}

/**
 * Check backend proxy and FHIR server health.
 */
export async function checkProxyHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return await response.json();
}

/**
 * Fetch patient laboratory observations or reports.
 */
export async function getPatientLabObservations(patientId) {
  if (!patientId) throw new Error('Patient ID is required');

  const url = `${API_BASE}/fhir/Observation?subject=Patient/${encodeURIComponent(patientId)}&category=laboratory&_count=100&_sort=-date`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/fhir+json, application/json'
    }
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = await response.json();
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry.map(e => e.resource).filter(r => r && r.resourceType === 'Observation');
  }

  return [];
}

/**
 * Create a new Laboratory Observation resource in FHIR.
 */
export async function createLabObservation({
  patientId,
  code = '24323-8',
  display = 'Comprehensive metabolic 2000 panel',
  value,
  unit = 'mg/dL',
  referenceRange = '0 - 100',
  interpretation = 'N',
  effectiveDateTime = new Date().toISOString()
}) {
  const observationResource = {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: code,
          display: display
        }
      ],
      text: display
    },
    subject: {
      reference: `Patient/${patientId}`
    },
    effectiveDateTime: effectiveDateTime,
    ...(typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))
      ? {
          valueQuantity: {
            value: Number(value),
            unit: unit,
            system: 'http://unitsofmeasure.org',
            code: unit
          }
        }
      : {
          valueString: String(value)
        }),
    referenceRange: [
      {
        text: referenceRange
      }
    ]
  };

  const response = await fetch(`${API_BASE}/fhir/Observation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json, application/json'
    },
    body: JSON.stringify(observationResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

export async function createVitalObservation({
  patientId,
  loinc,
  display,
  value,
  unit,
  encounterId
}) {
  if (!patientId || value === '' || value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const observationResource = {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: loinc,
          display
        }
      ],
      text: display
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: numeric,
      unit,
      system: 'http://unitsofmeasure.org',
      code: unit
    },
    ...(encounterId
      ? { encounter: { reference: `Encounter/${encounterId}` } }
      : {})
  };

  const response = await fetch(`${API_BASE}/fhir/Observation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json, application/json'
    },
    body: JSON.stringify(observationResource)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return await response.json();
}

export const INTEGRAMED_SERVICE_SYSTEM = 'https://integramed.app/fhir/catalog/healthcare-service';
export const INTEGRAMED_MEDICATION_SYSTEM = 'https://integramed.app/fhir/catalog/medication';
export const INTEGRAMED_SOAP_NOTE_TYPE = 'integramed-soap-note';

function bundleResources(data, resourceType) {
  if (!data) return [];
  if (data.resourceType === resourceType) return [data];
  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    return data.entry
      .map(e => e.resource)
      .filter(r => r && (!resourceType || r.resourceType === resourceType));
  }
  return [];
}

/**
 * Shared FHIR proxy request helper used by catalog and encounter review CRUD.
 */
export async function fhirRequest(path, { method = 'GET', body } = {}) {
  const headers = {
    Accept: 'application/fhir+json, application/json'
  };
  const options = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/fhir+json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/fhir/${String(path).replace(/^\//, '')}`, options);

  if (response.status === 204 || response.status === 202) {
    return true;
  }
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const text = await response.text();
  if (!text) return true;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getPatientAllergies(patientId) {
  if (!patientId) return [];
  try {
    const data = await fhirRequest(
      `AllergyIntolerance?patient=${encodeURIComponent(patientId)}&_count=50`
    );
    return bundleResources(data, 'AllergyIntolerance');
  } catch {
    return [];
  }
}

export async function getPatientDiagnosticReports(patientId) {
  if (!patientId) return [];
  try {
    const data = await fhirRequest(
      `DiagnosticReport?patient=${encodeURIComponent(patientId)}&_count=100&_sort=-issued`
    );
    return bundleResources(data, 'DiagnosticReport');
  } catch {
    return [];
  }
}

export async function getEncounterById(id) {
  if (!id) throw new Error('Encounter ID is required');
  return fhirRequest(`Encounter/${encodeURIComponent(id)}`);
}

export async function getPatientDocumentReferences(patientId) {
  if (!patientId) return [];
  try {
    const data = await fhirRequest(
      `DocumentReference?patient=${encodeURIComponent(patientId)}&_count=100&_sort=-date`
    );
    return bundleResources(data, 'DocumentReference');
  } catch {
    try {
      const data = await fhirRequest(
        `DocumentReference?subject=Patient/${encodeURIComponent(patientId)}&_count=100`
      );
      return bundleResources(data, 'DocumentReference');
    } catch {
      return [];
    }
  }
}

function encodeAttachmentJson(payload) {
  const json = JSON.stringify(payload);
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, 'utf8').toString('base64');
}

function decodeAttachmentJson(attachment) {
  if (!attachment) return null;
  try {
    if (attachment.data) {
      const json = typeof atob === 'function'
        ? decodeURIComponent(escape(atob(attachment.data)))
        : Buffer.from(attachment.data, 'base64').toString('utf8');
      return JSON.parse(json);
    }
  } catch {
    return null;
  }
  return null;
}

export function extractSoapNoteFromDocument(doc) {
  const attachment = doc?.content?.[0]?.attachment;
  const parsed = decodeAttachmentJson(attachment);
  if (parsed && typeof parsed === 'object') return parsed;
  return null;
}

export function buildSoapDocumentReference({
  id,
  patientId,
  patientName,
  encounterId,
  date,
  soap
}) {
  return {
    resourceType: 'DocumentReference',
    ...(id ? { id } : {}),
    status: 'current',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11506-3',
          display: 'Progress note'
        }
      ],
      text: INTEGRAMED_SOAP_NOTE_TYPE
    },
    category: [
      {
        text: INTEGRAMED_SOAP_NOTE_TYPE
      }
    ],
    subject: {
      reference: `Patient/${patientId}`,
      display: patientName || undefined
    },
    date: date || new Date().toISOString(),
    description: soap?.reason || soap?.summary || 'IntegraMed SOAP note',
    content: [
      {
        attachment: {
          contentType: 'application/json',
          title: 'IntegraMed SOAP clinical note',
          data: encodeAttachmentJson(soap)
        }
      }
    ],
    context: encounterId
      ? {
          encounter: [{ reference: `Encounter/${encounterId}` }]
        }
      : undefined
  };
}

export async function deleteMedicationRequest(id) {
  if (!id) return true;
  return fhirRequest(`MedicationRequest/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function deleteDiagnosticReport(id) {
  if (!id) return true;
  return fhirRequest(`DiagnosticReport/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function purgeEmptyPatientClinicalRecords(patientId) {
  if (!patientId) {
    return { encounters: [], medications: [], observations: [], reports: [] };
  }

  const [encounters, documents, medications, observations, reports] = await Promise.all([
    getEncounters(patientId).catch(() => []),
    getPatientDocumentReferences(patientId).catch(() => []),
    getPatientMedications(patientId).catch(() => []),
    getPatientObservations(patientId).catch(() => []),
    getPatientDiagnosticReports(patientId).catch(() => [])
  ]);

  const soapByEncounterId = {};
  documents.forEach((doc) => {
    const ref = doc?.context?.encounter?.[0]?.reference || '';
    const encId = String(ref).split('/').pop();
    if (!encId) return;
    soapByEncounterId[encId] = extractSoapNoteFromDocument(doc) || {};
  });

  const keptEncounters = [];
  await Promise.all((encounters || []).map(async (enc) => {
    const soap = soapByEncounterId[enc.id] || {};
    if (isEmptyEncounter(enc, soap)) {
      try {
        await deleteEncounter(enc.id);
      } catch (err) {
        console.info('Empty Encounter delete skipped:', err.message);
        keptEncounters.push(enc);
      }
      return;
    }
    keptEncounters.push(enc);
  }));

  const keptMedications = [];
  await Promise.all((medications || []).map(async (med) => {
    if (isEmptyMedicationRequest(med)) {
      try {
        await deleteMedicationRequest(med.id);
      } catch (err) {
        console.info('Empty MedicationRequest delete skipped:', err.message);
        keptMedications.push(med);
      }
      return;
    }
    keptMedications.push(med);
  }));

  const keptReports = [];
  await Promise.all((reports || []).map(async (report) => {
    if (isEmptyDiagnosticReport(report)) {
      try {
        await deleteDiagnosticReport(report.id);
      } catch (err) {
        console.info('Empty DiagnosticReport delete skipped:', err.message);
        keptReports.push(report);
      }
      return;
    }
    keptReports.push(report);
  }));

  const keptObservations = (observations || []).filter((obs) => !isEmptyObservation(obs));

  return {
    encounters: keptEncounters,
    medications: keptMedications,
    observations: keptObservations,
    reports: keptReports
  };
}

export async function saveEncounterSoapNote({
  documentId,
  patientId,
  patientName,
  encounterId,
  date,
  soap
}) {
  if (!hasSoapContent(soap)) return null;
  const resource = buildSoapDocumentReference({
    id: documentId,
    patientId,
    patientName,
    encounterId,
    date,
    soap
  });

  if (documentId) {
    return fhirRequest(`DocumentReference/${encodeURIComponent(documentId)}`, {
      method: 'PUT',
      body: resource
    });
  }

  return fhirRequest('DocumentReference', {
    method: 'POST',
    body: resource
  });
}

export async function deleteDocumentReference(id) {
  if (!id) return true;
  return fhirRequest(`DocumentReference/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getHealthcareServices() {
  const data = await fhirRequest('HealthcareService?_count=200');
  return bundleResources(data, 'HealthcareService');
}

export function clinicalServiceToHealthcareService(service) {
  const fhirId = service.fhirId || (service.id && !String(service.id).startsWith('serv-') ? service.id : undefined);
  return {
    resourceType: 'HealthcareService',
    ...(fhirId ? { id: fhirId } : {}),
    identifier: [
      {
        system: INTEGRAMED_SERVICE_SYSTEM,
        value: service.id || fhirId || `serv-${Date.now()}`
      }
    ],
    active: service.status !== 'temporarily_unavailable',
    name: service.nameEn || service.nameEs,
    comment: service.nameEs || service.nameEn,
    extraDetails: JSON.stringify(service),
    category: [{ text: service.category || 'consulta_especialidad' }],
    type: [{ text: service.department || service.category || 'Clinical Service' }],
    appointmentRequired: Boolean(service.requiresAppointment),
    providedBy: service.organizationFhirId
      ? { reference: `Organization/${service.organizationFhirId}`, display: service.organizationName }
      : undefined,
    location: Array.isArray(service.locationFhirIds)
      ? service.locationFhirIds.filter(Boolean).map((id) => ({ reference: `Location/${id}` }))
      : undefined
  };
}

export function healthcareServiceToClinicalService(resource) {
  if (!resource) return null;
  let extra = {};
  if (resource.extraDetails) {
    try {
      extra = JSON.parse(resource.extraDetails);
    } catch {
      extra = {};
    }
  }
  const localId = resource.identifier?.find(i => i.system === INTEGRAMED_SERVICE_SYSTEM)?.value
    || extra.id
    || resource.id;

  return {
    ...extra,
    id: localId,
    fhirId: resource.id,
    nameEn: extra.nameEn || resource.name || extra.nameEs,
    nameEs: extra.nameEs || resource.comment || resource.name,
    category: extra.category || resource.category?.[0]?.text || 'consulta_especialidad',
    department: extra.department || resource.type?.[0]?.text || '',
    status: resource.active === false ? 'temporarily_unavailable' : (extra.status || 'available'),
    requiresAppointment: extra.requiresAppointment ?? Boolean(resource.appointmentRequired)
  };
}

export async function createHealthcareService(service) {
  return fhirRequest('HealthcareService', {
    method: 'POST',
    body: clinicalServiceToHealthcareService(service)
  });
}

export async function updateHealthcareService(fhirId, service) {
  if (!fhirId) throw new Error('HealthcareService ID is required for update');
  return fhirRequest(`HealthcareService/${encodeURIComponent(fhirId)}`, {
    method: 'PUT',
    body: clinicalServiceToHealthcareService({ ...service, fhirId })
  });
}

export async function deleteHealthcareService(fhirId) {
  if (!fhirId) return true;
  return fhirRequest(`HealthcareService/${encodeURIComponent(fhirId)}`, { method: 'DELETE' });
}

export async function upsertPractitionerRole({
  practitionerFhirId,
  practitionerName,
  organizationFhirId,
  organizationName,
  locationFhirId,
  locationName,
  role,
  specialties = []
}) {
  if (!practitionerFhirId || !organizationFhirId) return null;
  const existing = await fhirRequest(
    `PractitionerRole?practitioner=${encodeURIComponent(practitionerFhirId)}&_count=20`
  );
  const roles = bundleResources(existing, 'PractitionerRole');
  const match = roles.find((item) => {
    const orgId = String(item.organization?.reference || '').split('/').pop();
    const locId = String(item.location?.[0]?.reference || '').split('/').pop();
    return orgId === organizationFhirId && (!locationFhirId || locId === locationFhirId);
  }) || roles[0];

  const body = {
    resourceType: 'PractitionerRole',
    ...(match?.id ? { id: match.id } : {}),
    active: true,
    practitioner: { reference: `Practitioner/${practitionerFhirId}`, display: practitionerName },
    organization: { reference: `Organization/${organizationFhirId}`, display: organizationName },
    location: locationFhirId
      ? [{ reference: `Location/${locationFhirId}`, display: locationName }]
      : undefined,
    code: role ? [{ text: role }] : undefined,
    specialty: specialties.map((text) => ({ text }))
  };

  if (match?.id) {
    return fhirRequest(`PractitionerRole/${encodeURIComponent(match.id)}`, { method: 'PUT', body });
  }
  return fhirRequest('PractitionerRole', { method: 'POST', body });
}

export async function getFhirMedications() {
  const data = await fhirRequest('Medication?_count=200');
  return bundleResources(data, 'Medication');
}

export function catalogMedicationToFhir(med) {
  const fhirId = med.fhirId || (med.id && !String(med.id).startsWith('med-') ? med.id : undefined);
  return {
    resourceType: 'Medication',
    ...(fhirId ? { id: fhirId } : {}),
    identifier: [
      {
        system: INTEGRAMED_MEDICATION_SYSTEM,
        value: med.id || fhirId || `med-${Date.now()}`
      }
    ],
    code: {
      text: med.genericName || med.brandName,
      coding: med.code
        ? [{ display: med.genericName || med.brandName, code: String(med.code).slice(0, 64) }]
        : undefined
    },
    status: 'active',
    form: { text: med.dosageForm || med.route || 'Oral' },
    ingredient: [
      {
        itemCodeableConcept: { text: med.genericName || med.brandName },
        strength: med.strength
          ? { numerator: { value: parseFloat(String(med.strength)) || undefined, unit: String(med.strength) } }
          : undefined
      }
    ]
  };
}

export function fhirMedicationToCatalog(resource, fallback = {}) {
  const localId = resource.identifier?.find(i => i.system === INTEGRAMED_MEDICATION_SYSTEM)?.value
    || fallback.id
    || resource.id;
  return {
    ...fallback,
    id: localId,
    fhirId: resource.id,
    genericName: fallback.genericName || resource.code?.text || resource.ingredient?.[0]?.itemCodeableConcept?.text,
    brandName: fallback.brandName || resource.code?.text,
    dosageForm: fallback.dosageForm || resource.form?.text
  };
}

export async function createFhirMedication(med) {
  return fhirRequest('Medication', {
    method: 'POST',
    body: catalogMedicationToFhir(med)
  });
}

export async function updateFhirMedication(fhirId, med) {
  if (!fhirId) throw new Error('Medication ID is required for update');
  return fhirRequest(`Medication/${encodeURIComponent(fhirId)}`, {
    method: 'PUT',
    body: catalogMedicationToFhir({ ...med, fhirId })
  });
}

export async function deleteFhirMedication(fhirId) {
  if (!fhirId) return true;
  return fhirRequest(`Medication/${encodeURIComponent(fhirId)}`, { method: 'DELETE' });
}

export async function updatePractitioner(id, {
  prefix = 'Dr.',
  givenName,
  familyName,
  gender = 'unknown',
  email,
  phone,
  qualification,
  active = true
}) {
  if (!id) throw new Error('Practitioner ID is required for update');
  const givenArray = givenName ? givenName.trim().split(/\s+/).filter(Boolean) : [];
  const practitionerResource = {
    resourceType: 'Practitioner',
    id,
    active,
    name: [
      {
        use: 'official',
        prefix: prefix ? [prefix] : ['Dr.'],
        family: familyName ? familyName.trim() : '',
        given: givenArray
      }
    ],
    gender: gender || 'unknown',
    telecom: [
      ...(email ? [{ system: 'email', value: email.trim(), use: 'work' }] : []),
      ...(phone ? [{ system: 'phone', value: phone.trim(), use: 'work' }] : [])
    ]
  };
  if (qualification) {
    practitionerResource.qualification = [{ code: { text: qualification.trim() } }];
  }
  return fhirRequest(`Practitioner/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: practitionerResource
  });
}

export async function deletePractitionerResource(id) {
  if (!id) throw new Error('Practitioner ID is required for deletion');
  return fhirRequest(`Practitioner/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Update runtime FHIR Proxy server settings.
 */
export async function updateProxyConfig(fhirBaseUrl, fhirAuthToken, fhirMode) {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fhirBaseUrl, fhirAuthToken, fhirMode })
  });

  if (!response.ok) {
    throw new Error('Failed to update proxy configuration');
  }

  return await response.json();
}

