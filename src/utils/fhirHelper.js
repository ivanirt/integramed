/**
 * FHIR R4 Patient Utility & Formatting Helpers
 */

/**
 * Extracts and formats the full name of a FHIR Patient resource.
 * Uses name[0].given (array) and name[0].family (string).
 */
export function getPatientFullName(patient) {
  if (!patient || !patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
    return 'Unnamed Patient';
  }

  // Find official or first available name
  const officialName = patient.name.find(n => n.use === 'official') || patient.name[0];
  
  const given = Array.isArray(officialName.given) ? officialName.given.join(' ') : (officialName.given || '');
  const family = officialName.family || '';

  const full = `${given} ${family}`.trim();
  return full || 'Unnamed Patient';
}

/**
 * Extracts given names as a single space-separated string for editing.
 */
export function getPatientGivenName(patient) {
  if (!patient || !patient.name || !patient.name.length) return '';
  const nameObj = patient.name.find(n => n.use === 'official') || patient.name[0];
  if (!nameObj || !nameObj.given) return '';
  return Array.isArray(nameObj.given) ? nameObj.given.join(' ') : String(nameObj.given);
}

/**
 * Extracts family name string for editing.
 */
export function getPatientFamilyName(patient) {
  if (!patient || !patient.name || !patient.name.length) return '';
  const nameObj = patient.name.find(n => n.use === 'official') || patient.name[0];
  return nameObj?.family || '';
}

/**
 * Formats birthDate string (YYYY-MM-DD) with human readable date.
 */
export function formatBirthDate(birthDate, locale = 'en-US') {
  if (!birthDate) return 'Unknown';
  try {
    const parts = birthDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(date);
      }
    }
    return birthDate;
  } catch {
    return birthDate;
  }
}

/**
 * Calculates current age in years given a YYYY-MM-DD birthDate.
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;
  try {
    const [year, month, day] = birthDate.split('-').map(Number);
    if (!year || !month || !day) return null;
    
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() + 1 - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Extracts primary medical record number (MRN) or first identifier if available.
 */
export function getPatientIdentifier(patient) {
  if (!patient || !patient.identifier || !patient.identifier.length) {
    return patient?.id ? `ID: ${patient.id.substring(0, 8)}...` : 'N/A';
  }
  
  const mrn = patient.identifier.find(i => 
    i.type?.coding?.some(c => c.code === 'MR') || i.type?.text?.toLowerCase().includes('medical record')
  );
  if (mrn?.value) return `MRN: ${mrn.value}`;

  return patient.identifier[0]?.value ? `ID: ${patient.identifier[0].value}` : `ID: ${patient.id?.substring(0, 8)}`;
}

/**
 * Builds a FHIR R4 Patient JSON object for POST or PUT requests.
 */
export function buildFhirPatientResource({ givenName, familyName, gender, birthDate, id, originalResource }) {
  const givenArray = givenName
    ? givenName.trim().split(/\s+/).filter(Boolean)
    : [];

  const nameObject = {
    use: 'official',
    family: familyName ? familyName.trim() : '',
    given: givenArray
  };

  const resource = {
    ...(originalResource || {}),
    resourceType: 'Patient',
    gender: gender || 'unknown',
    birthDate: birthDate || ''
  };

  if (id) {
    resource.id = id;
  }

  // Update or set the primary official name
  if (resource.name && Array.isArray(resource.name) && resource.name.length > 0) {
    resource.name = [
      {
        ...resource.name[0],
        ...nameObject
      },
      ...resource.name.slice(1)
    ];
  } else {
    resource.name = [nameObject];
  }

  return resource;
}
