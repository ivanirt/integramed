/**
 * Facilities, Organizations & Locations Storage for IntegraMed
 * Aligned with HL7 FHIR R4 Organization & Location resources
 */

export const INITIAL_ORGANIZATIONS = [
  {
    id: 'org-integramed-central',
    name: 'IntegraMed Red Hospitalaria S.A. de C.V.',
    alias: 'Grupo IntegraMed Salud',
    type: 'prov', // Healthcare Provider
    typeName: 'Red Hospitalaria y Clínicas de Especialidad',
    taxId: 'IME190824AB3',
    license: 'COFEPRIS 21-3300-201-094',
    director: 'Dr. Jesús Robledo Morales',
    phone: '+52 55 5234 8100',
    email: 'direccion@integramed.com',
    website: 'https://integramed.health',
    status: 'active',
    logoBg: '#0f766e',
    logoText: '#ffffff',
    foundedYear: 2018
  },
  {
    id: 'org-integramed-rehab',
    name: 'IntegraMed Centros de Neurorehabilitación Integral S.C.',
    alias: 'IntegraMed Fisioterapia',
    type: 'rehab',
    typeName: 'Centros Especializados en Medicina Física y Deporte',
    taxId: 'INR210315KL9',
    license: 'COFEPRIS 22-3300-405-112',
    director: 'Dr. Edgar Robledo Morales',
    phone: '+52 55 5234 8120',
    email: 'rehabilitacion@integramed.com',
    website: 'https://rehab.integramed.health',
    status: 'active',
    logoBg: '#0284c7',
    logoText: '#ffffff',
    foundedYear: 2021
  }
];

export const INITIAL_LOCATIONS = [
  {
    id: 'loc-santafe',
    organizationId: 'org-integramed-central',
    code: 'PLANTEL-SF-01',
    name: 'Plantel Santa Fe — Sede Médica Principal',
    description: 'Sede central de alta especialidad médica, urgencias ambulatorias, diagnóstico integral y laboratorios certificados.',
    type: 'hospital',
    typeName: 'Sede Principal / Hospital Ambulatorio',
    status: 'active',
    phone: '+52 55 5234 8101',
    email: 'santafe@integramed.com',
    operatingHours: 'Lun a Sáb: 07:00 - 21:00 | Urgencias 24h',
    address: {
      line: 'Av. Vasco de Quiroga 3800, Torre Médica Integra, Piso 4 y 5',
      district: 'Santa Fe / Zedec',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '05348',
      country: 'México'
    },
    capacity: {
      consultingRooms: 14,
      therapyBooths: 6,
      operatingTheaters: 2,
      recoveryBeds: 8
    },
    services: [
      'Urgencias y Triage 24h',
      'Laboratorio Clínico FHIR R4',
      'Rayos X Digital y Ecografía POCUS',
      'Farmacia Intrahospitalaria',
      'Sala de Choque y Reanimación',
      'Estacionamiento con Valet Parking',
      'Acceso 100% Accesible (Rampas/Elevador)'
    ],
    rooms: [
      { id: 'r-101', name: 'Consultorio 101', specialty: 'Medicina Interna', practitionerId: 'staff-jesus-robledo' },
      { id: 'r-102', name: 'Consultorio 102', specialty: 'Medicina General', practitionerId: 'staff-edgar-robledo' },
      { id: 'r-103', name: 'Consultorio 103', specialty: 'Pediatría y Vacunación', practitionerId: 'staff-mariana-dominguez' },
      { id: 'r-104', name: 'Módulo de Triage y Signos', specialty: 'Enfermería', practitionerId: 'staff-carmen-saldana' },
      { id: 'r-lab-1', name: 'Laboratorio de Análisis Clínicos', specialty: 'Química Clínica', practitionerId: 'staff-luis-fernando-garza' }
    ]
  },
  {
    id: 'loc-pedregal',
    organizationId: 'org-integramed-central',
    code: 'PLANTEL-PED-02',
    name: 'Plantel Pedregal — Clínica de Especialidades',
    description: 'Centro de atención ambulatoria, medicina familiar, laboratorio de tomas y medicina preventiva del sur.',
    type: 'clinic',
    typeName: 'Clínica Ambulatoria y Especialidades',
    status: 'active',
    phone: '+52 55 5234 8102',
    email: 'pedregal@integramed.com',
    operatingHours: 'Lunes a Viernes: 08:00 - 20:00 | Sábado: 08:00 - 15:00',
    address: {
      line: 'Periférico Sur 4120, Col. Jardines del Pedregal',
      district: 'Jardines del Pedregal',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '01900',
      country: 'México'
    },
    capacity: {
      consultingRooms: 8,
      therapyBooths: 4,
      operatingTheaters: 0,
      recoveryBeds: 2
    },
    services: [
      'Consulta de Especialidades',
      'Módulo de Toma de Muestras y Laboratorio',
      'Chequeos Médicos Ejecutivos',
      'Farmacia y Dispensario',
      'Estacionamiento Privado'
    ],
    rooms: [
      { id: 'r-201', name: 'Consultorio 201', specialty: 'Medicina Familiar', practitionerId: 'staff-edgar-robledo' },
      { id: 'r-202', name: 'Consultorio 202', specialty: 'Enfermería y Curaciones', practitionerId: 'staff-lluvia-robledo' },
      { id: 'r-203', name: 'Toma de Muestras 1', specialty: 'Laboratorio', practitionerId: 'staff-edith-alvarez' }
    ]
  },
  {
    id: 'loc-polanco-rehab',
    organizationId: 'org-integramed-rehab',
    code: 'PLANTEL-POL-03',
    name: 'Plantel Polanco — Centro de Fisioterapia & Neuro-Rehabilitación',
    description: 'Instalaciones de vanguardia para fisioterapia neurológica, deportiva, hidroterapia y rehabilitación traumatológica.',
    type: 'rehab_center',
    typeName: 'Centro de Rehabilitación Integral',
    status: 'active',
    phone: '+52 55 5234 8103',
    email: 'polanco@integramed.com',
    operatingHours: 'Lunes a Viernes: 07:00 - 21:00 | Sábado: 08:00 - 16:00',
    address: {
      line: 'Campos Elíseos 204, Polanco V Sección',
      district: 'Polanco',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '11560',
      country: 'México'
    },
    capacity: {
      consultingRooms: 4,
      therapyBooths: 10,
      operatingTheaters: 0,
      recoveryBeds: 4
    },
    services: [
      'Gimnasio Terapéutico Bobath',
      'Terapia Manual Ortopédica y Punción Seca',
      'Electromiografía y Biofeedback',
      'Área de Terapia Ocupacional',
      'Valoración Biomecánica Digital'
    ],
    rooms: [
      { id: 'r-301', name: 'Cabina Neuro-Bobath 1', specialty: 'Neurorehabilitación', practitionerId: 'staff-sofia-mendiola' },
      { id: 'r-302', name: 'Cabina Terapia Física 2', specialty: 'Fisioterapia Deportiva', practitionerId: 'staff-edgar-robledo' }
    ]
  }
];

const ORGS_STORAGE_KEY = 'integramed_organizations_data';
const LOCS_STORAGE_KEY = 'integramed_locations_data';

export function getOrganizations() {
  try {
    const raw = localStorage.getItem(ORGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error loading organizations', e);
  }
  try {
    localStorage.setItem(ORGS_STORAGE_KEY, JSON.stringify(INITIAL_ORGANIZATIONS));
  } catch {}
  return INITIAL_ORGANIZATIONS;
}

export function saveOrganizations(orgList) {
  try {
    localStorage.setItem(ORGS_STORAGE_KEY, JSON.stringify(orgList));
  } catch (e) {
    console.error('Failed to save organizations', e);
  }
}

export function saveOrganization(orgData) {
  const list = getOrganizations();
  const index = list.findIndex(o => o.id === orgData.id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...updated[index], ...orgData };
  } else {
    updated = [orgData, ...list];
  }
  saveOrganizations(updated);
  return updated;
}

export function deleteOrganization(orgId) {
  const list = getOrganizations();
  const updated = list.filter(o => o.id !== orgId);
  saveOrganizations(updated);
  return updated;
}

export function getLocations() {
  try {
    const raw = localStorage.getItem(LOCS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error loading locations', e);
  }
  try {
    localStorage.setItem(LOCS_STORAGE_KEY, JSON.stringify(INITIAL_LOCATIONS));
  } catch {}
  return INITIAL_LOCATIONS;
}

export function saveLocations(locList) {
  try {
    localStorage.setItem(LOCS_STORAGE_KEY, JSON.stringify(locList));
  } catch (e) {
    console.error('Failed to save locations', e);
  }
}

export function saveLocation(locData) {
  const list = getLocations();
  const index = list.findIndex(l => l.id === locData.id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...updated[index], ...locData };
  } else {
    updated = [locData, ...list];
  }
  saveLocations(updated);
  return updated;
}

export function deleteLocation(locId) {
  const list = getLocations();
  const updated = list.filter(l => l.id !== locId);
  saveLocations(updated);
  return updated;
}

export function resetFacilitiesData() {
  saveOrganizations(INITIAL_ORGANIZATIONS);
  saveLocations(INITIAL_LOCATIONS);
  return { organizations: INITIAL_ORGANIZATIONS, locations: INITIAL_LOCATIONS };
}
