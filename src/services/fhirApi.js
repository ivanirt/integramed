/**
 * Client-side FHIR API service that interacts with the backend FHIR Proxy.
 */
import { buildFhirPatientResource } from '../utils/fhirHelper';

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
 * Update runtime FHIR Proxy server settings.
 */
export async function updateProxyConfig(fhirBaseUrl, fhirAuthToken) {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fhirBaseUrl, fhirAuthToken })
  });

  if (!response.ok) {
    throw new Error('Failed to update proxy configuration');
  }

  return await response.json();
}
