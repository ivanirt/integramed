/**
 * Facilities, Organizations & Locations Storage for IntegraMed
 * Aligned with HL7 FHIR R4 Organization & Location resources
 */

import {
  upsertPayloadItem,
  deletePayloadItem,
  loadConfigBlob,
  saveConfigBlob,
  preferRemote,
  readCachedArray,
  loadKindOrNative,
  mapNativeOrganization,
  mapNativeLocation
} from '../services/fhirPayloadStore.js';

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

export const DEFAULT_FACILITY_RESOURCE_TYPES = [
  {
    id: 'consultingRooms',
    nameEs: 'Consultorios Médicos',
    nameEn: 'Consulting Rooms',
    category: 'consulting',
    icon: 'Stethoscope',
    defaultUnit: 'consultorios',
    color: '#15803d',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    descriptionEs: 'Espacios asignados para consulta médica general y de especialidades.',
    descriptionEn: 'Dedicated spaces for general and specialty medical consultations.'
  },
  {
    id: 'therapyBooths',
    nameEs: 'Cabinas de Terapia & Fisioterapia',
    nameEn: 'Therapy & Rehab Booths',
    category: 'therapy',
    icon: 'Activity',
    defaultUnit: 'cabinas',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    borderColor: '#bae6fd',
    descriptionEs: 'Módulos individuales y boxes para fisioterapia, masajes y electroterapia.',
    descriptionEn: 'Individual booths for physical therapy and electrotherapy.'
  },
  {
    id: 'operatingTheaters',
    nameEs: 'Quirófanos Ambulatorios & Cirugía Menor',
    nameEn: 'Operating Theaters & Minor Surgery',
    category: 'surgery',
    icon: 'Building',
    defaultUnit: 'quirófanos',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    borderColor: '#ddd6fe',
    descriptionEs: 'Salas de cirugía ambulatoria, procedimientos estériles y curaciones mayores.',
    descriptionEn: 'Ambulatory surgery suites and sterile procedure rooms.'
  },
  {
    id: 'recoveryBeds',
    nameEs: 'Camas de Observación & Recuperación',
    nameEn: 'Observation & Recovery Beds',
    category: 'beds',
    icon: 'Bed',
    defaultUnit: 'camas',
    color: '#d97706',
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
    descriptionEs: 'Camas clínicas para recuperación post-procedimiento, corta estancia y urgencias.',
    descriptionEn: 'Hospital and recovery beds for observation and short-stay care.'
  }
];

export const AREA_TYPES = [
  { id: 'consultation', labelEs: 'Consultorio', labelEn: 'Consultation' },
  { id: 'therapy', labelEs: 'Terapia', labelEn: 'Therapy' },
  { id: 'procedure', labelEs: 'Procedimientos', labelEn: 'Procedure' },
  { id: 'waiting', labelEs: 'Espera', labelEn: 'Waiting' },
  { id: 'laboratory', labelEs: 'Laboratorio', labelEn: 'Laboratory' },
  { id: 'imaging', labelEs: 'Imagenología', labelEn: 'Imaging' },
  { id: 'pharmacy', labelEs: 'Farmacia', labelEn: 'Pharmacy' },
  { id: 'administration', labelEs: 'Administración', labelEn: 'Administration' },
  { id: 'other', labelEs: 'Otro', labelEn: 'Other' }
];

export function areaTypeLabel(typeId, language = 'es') {
  const match = AREA_TYPES.find((item) => item.id === typeId);
  if (!match) return typeId || '';
  return language === 'en' ? match.labelEn : match.labelEs;
}

export function formatFacilityAddress(address) {
  if (!address) return '';
  return [
    address.line,
    address.district,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.state,
    address.country
  ].filter(Boolean).join(', ');
}

export function locationsForOrganization(orgId, locations = getLocations(), organizations = getOrganizations()) {
  if (!orgId) return [];
  const org = organizations.find((item) => item.id === orgId || item.fhirId === orgId);
  const ids = new Set([orgId, org?.id, org?.fhirId].filter(Boolean));
  const seen = new Set();
  return locations.filter((loc) => {
    if (!ids.has(loc.organizationId)) return false;
    const key = loc.id || loc.fhirId;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function areasForOrganization(orgId, locations = getLocations()) {
  return locationsForOrganization(orgId, locations).filter((loc) => loc.kind !== 'site');
}

export function siteForOrganization(orgId, locations = getLocations()) {
  return locationsForOrganization(orgId, locations).find((loc) => loc.kind === 'site') || null;
}

export const DEFAULT_FACILITY_SERVICES_CATALOG = [
  'Urgencias y Triage 24h',
  'Laboratorio Clínico FHIR R4',
  'Rayos X Digital y Ecografía POCUS',
  'Farmacia Intrahospitalaria',
  'Gimnasio Terapéutico Bobath',
  'Quirófano Ambulatorio',
  'Estacionamiento con Valet Parking',
  'Acceso 100% Accesible (Rampas/Elevador)',
  'Consulta de Especialidades',
  'Módulo de Toma de Muestras y Laboratorio',
  'Chequeos Médicos Ejecutivos',
  'Terapia Manual Ortopédica y Punción Seca',
  'Electromiografía y Biofeedback',
  'Área de Terapia Ocupacional',
  'Valoración Biomecánica Digital',
  'Sala de Choque y Reanimación'
];

const ORGS_STORAGE_KEY = 'integramed_organizations_fhir';
const LOCS_STORAGE_KEY = 'integramed_locations_fhir';
const RESOURCE_TYPES_STORAGE_KEY = 'integramed_facility_resource_types_fhir';
const SERVICES_CATALOG_STORAGE_KEY = 'integramed_facility_services_catalog_fhir';

let resourceTypesFhirId = null;
let servicesCatalogFhirId = null;

export function getOrganizations() {
  return readCachedArray(ORGS_STORAGE_KEY);
}

function dedupeById(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = item?.id || item?.fhirId;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function saveOrganizations(orgList) {
  try {
    localStorage.setItem(ORGS_STORAGE_KEY, JSON.stringify(dedupeById(orgList)));
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

  const saved = updated.find(o => o.id === orgData.id) || orgData;
  upsertPayloadItem({
    resourceType: 'Organization',
    kind: 'organization',
    item: saved,
    buildBase: (p) => ({
      name: p.name,
      alias: p.alias ? [p.alias] : undefined,
      active: p.status !== 'inactive',
      telecom: [
        ...(p.phone ? [{ system: 'phone', value: p.phone }] : []),
        ...(p.email ? [{ system: 'email', value: p.email }] : []),
        ...(p.website ? [{ system: 'url', value: p.website }] : [])
      ],
      address: p.address
        ? [{
            use: 'work',
            type: 'physical',
            line: p.address.line ? [p.address.line] : undefined,
            city: p.address.city,
            district: p.address.district,
            state: p.address.state,
            postalCode: p.address.postalCode,
            country: p.address.country
          }]
        : undefined
    })
  }).then((remote) => {
    if (remote?.fhirId) {
      const next = getOrganizations().map((o) => (o.id === remote.id ? { ...o, fhirId: remote.fhirId } : o));
      saveOrganizations(next);
    }
  }).catch((err) => console.info('FHIR Organization sync skipped:', err.message));

  return updated;
}

export async function persistOrganization(orgData) {
  const list = saveOrganization(orgData);
  const saved = list.find((o) => o.id === orgData.id) || orgData;
  try {
    const remote = await upsertPayloadItem({
      resourceType: 'Organization',
      kind: 'organization',
      item: saved,
      buildBase: (p) => ({
        name: p.name,
        alias: p.alias ? [p.alias] : undefined,
        active: p.status !== 'inactive',
        telecom: [
          ...(p.phone ? [{ system: 'phone', value: p.phone }] : []),
          ...(p.email ? [{ system: 'email', value: p.email }] : []),
          ...(p.website ? [{ system: 'url', value: p.website }] : [])
        ],
        address: p.address
          ? [{
              use: 'work',
              type: 'physical',
              line: p.address.line ? [p.address.line] : undefined,
              city: p.address.city,
              district: p.address.district,
              state: p.address.state,
              postalCode: p.address.postalCode,
              country: p.address.country
            }]
          : undefined
      })
    });
    if (remote?.fhirId) {
      const next = getOrganizations().map((o) => (o.id === remote.id ? { ...o, fhirId: remote.fhirId } : o));
      saveOrganizations(next);
    }
  } catch (err) {
    console.info('FHIR Organization persist skipped:', err.message);
  }
  return getOrganizations();
}

export function deleteOrganization(orgId) {
  const list = getOrganizations();
  const target = list.find(o => o.id === orgId);
  const updated = list.filter(o => o.id !== orgId);
  saveOrganizations(updated);
  if (target?.fhirId) deletePayloadItem('Organization', target.fhirId);
  return updated;
}

export function getLocations() {
  return readCachedArray(LOCS_STORAGE_KEY);
}

export function saveLocations(locList) {
  try {
    localStorage.setItem(LOCS_STORAGE_KEY, JSON.stringify(dedupeById(locList)));
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

  const saved = updated.find(l => l.id === locData.id) || locData;
  const org = getOrganizations().find(o => o.id === saved.organizationId);
  upsertPayloadItem({
    resourceType: 'Location',
    kind: 'location',
    item: saved,
    buildBase: (p) => ({
      name: p.name,
      status: p.status === 'inactive' ? 'inactive' : 'active',
      description: p.description,
      mode: 'instance',
      physicalType: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/location-physical-type',
          code: p.kind === 'site' ? 'si' : 'ro',
          display: p.kind === 'site' ? 'Site' : 'Room'
        }]
      },
      type: p.areaType
        ? [{
            coding: [{
              system: 'https://integramed.app/fhir/CodeSystem/location-type',
              code: p.areaType,
              display: p.typeName || p.areaType
            }],
            text: p.typeName || p.areaType
          }]
        : undefined,
      telecom: [
        ...(p.phone ? [{ system: 'phone', value: p.phone }] : []),
        ...(p.email ? [{ system: 'email', value: p.email }] : [])
      ],
      address: p.address
        ? {
            line: p.address.line ? [p.address.line] : undefined,
            city: p.address.city,
            district: p.address.district,
            state: p.address.state,
            postalCode: p.address.postalCode,
            country: p.address.country
          }
        : undefined,
      managingOrganization: org?.fhirId
        ? { reference: `Organization/${org.fhirId}`, display: org.name }
        : undefined,
      partOf: p.partOfFhirId
        ? { reference: `Location/${p.partOfFhirId}`, display: p.partOfName }
        : undefined
    })
  }).then((remote) => {
    if (remote?.fhirId) {
      const next = getLocations().map((l) => (l.id === remote.id ? { ...l, fhirId: remote.fhirId } : l));
      saveLocations(next);
    }
  }).catch((err) => console.info('FHIR Location sync skipped:', err.message));

  return updated;
}

export async function persistLocation(locData) {
  const list = saveLocation(locData);
  const saved = list.find((l) => l.id === locData.id) || locData;
  const org = getOrganizations().find((o) => o.id === saved.organizationId);
  try {
    const remote = await upsertPayloadItem({
      resourceType: 'Location',
      kind: 'location',
      item: { ...saved, fhirId: saved.fhirId },
      buildBase: (p) => ({
        name: p.name,
        status: p.status === 'inactive' ? 'inactive' : 'active',
        description: p.description,
        mode: 'instance',
        physicalType: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/location-physical-type',
            code: p.kind === 'site' ? 'si' : 'ro',
            display: p.kind === 'site' ? 'Site' : 'Room'
          }]
        },
        type: p.areaType
          ? [{
              coding: [{
                system: 'https://integramed.app/fhir/CodeSystem/location-type',
                code: p.areaType,
                display: p.typeName || p.areaType
              }],
              text: p.typeName || p.areaType
            }]
          : undefined,
        address: p.address
          ? {
              line: p.address.line ? [p.address.line] : undefined,
              city: p.address.city,
              district: p.address.district,
              state: p.address.state,
              postalCode: p.address.postalCode,
              country: p.address.country
            }
          : undefined,
        managingOrganization: org?.fhirId
          ? { reference: `Organization/${org.fhirId}`, display: org.name }
          : undefined,
        partOf: p.partOfFhirId
          ? { reference: `Location/${p.partOfFhirId}`, display: p.partOfName }
          : undefined
      })
    });
    if (remote?.fhirId) {
      const next = getLocations().map((l) => (l.id === remote.id ? { ...l, fhirId: remote.fhirId } : l));
      saveLocations(next);
    }
  } catch (err) {
    console.info('FHIR Location persist skipped:', err.message);
  }
  return getLocations();
}

export function deleteLocation(locId) {
  const list = getLocations();
  const target = list.find(l => l.id === locId);
  const updated = list.filter(l => l.id !== locId);
  saveLocations(updated);
  if (target?.fhirId) deletePayloadItem('Location', target.fhirId);
  return updated;
}

/**
 * Facility Resource Types (Consultorios, Cabinas, Quirófanos, Camas, etc.) Storage & CRUD
 */
export function getFacilityResourceTypes() {
  return readCachedArray(RESOURCE_TYPES_STORAGE_KEY);
}

export function saveFacilityResourceTypes(typesList) {
  try {
    localStorage.setItem(RESOURCE_TYPES_STORAGE_KEY, JSON.stringify(typesList));
  } catch (e) {
    console.error('Failed to save facility resource types', e);
  }
  saveConfigBlob('facility-resource-types', typesList, resourceTypesFhirId)
    .then((id) => { resourceTypesFhirId = id; })
    .catch((err) => console.info('FHIR resource types sync skipped:', err.message));
}

export function saveFacilityResourceType(resourceType) {
  const list = getFacilityResourceTypes();
  const index = list.findIndex(r => r.id === resourceType.id);
  let updated;
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...updated[index], ...resourceType };
  } else {
    updated = [...list, resourceType];
  }
  saveFacilityResourceTypes(updated);
  return updated;
}

export function deleteFacilityResourceType(resourceTypeId) {
  const list = getFacilityResourceTypes();
  const updated = list.filter(r => r.id !== resourceTypeId);
  saveFacilityResourceTypes(updated);
  return updated;
}

export function resetFacilityResourceTypes() {
  saveFacilityResourceTypes([]);
  return [];
}

/**
 * Facility Services Catalog Storage & CRUD
 */
export function getFacilityServicesCatalog() {
  return readCachedArray(SERVICES_CATALOG_STORAGE_KEY);
}

export function saveFacilityServicesCatalog(servicesList) {
  try {
    localStorage.setItem(SERVICES_CATALOG_STORAGE_KEY, JSON.stringify(servicesList));
  } catch (e) {
    console.error('Failed to save facility services catalog', e);
  }
  saveConfigBlob('facility-services-catalog', servicesList, servicesCatalogFhirId)
    .then((id) => { servicesCatalogFhirId = id; })
    .catch((err) => console.info('FHIR facility services catalog sync skipped:', err.message));
}

export function saveFacilityServiceCatalogItem(serviceName) {
  if (!serviceName || typeof serviceName !== 'string' || !serviceName.trim()) return getFacilityServicesCatalog();
  const cleanName = serviceName.trim();
  const list = getFacilityServicesCatalog();
  if (!list.includes(cleanName)) {
    const updated = [...list, cleanName];
    saveFacilityServicesCatalog(updated);
    return updated;
  }
  return list;
}

export function updateFacilityServiceCatalogItem(oldName, newName) {
  if (!oldName || !newName || !newName.trim()) return getFacilityServicesCatalog();
  const cleanNew = newName.trim();
  const list = getFacilityServicesCatalog();
  const updated = list.map(item => item === oldName ? cleanNew : item);
  saveFacilityServicesCatalog(updated);

  // Also update locations that contain oldName
  const locations = getLocations();
  let modifiedLocs = false;
  const updatedLocs = locations.map(loc => {
    if (loc.services && loc.services.includes(oldName)) {
      modifiedLocs = true;
      return {
        ...loc,
        services: loc.services.map(s => s === oldName ? cleanNew : s)
      };
    }
    return loc;
  });
  if (modifiedLocs) {
    saveLocations(updatedLocs);
  }

  return updated;
}

export function deleteFacilityServiceCatalogItem(serviceName) {
  const list = getFacilityServicesCatalog();
  const updated = list.filter(s => s !== serviceName);
  saveFacilityServicesCatalog(updated);

  const locations = getLocations();
  let modifiedLocs = false;
  const updatedLocs = locations.map(loc => {
    if (loc.services && loc.services.includes(serviceName)) {
      modifiedLocs = true;
      return {
        ...loc,
        services: loc.services.filter(s => s !== serviceName)
      };
    }
    return loc;
  });
  if (modifiedLocs) {
    saveLocations(updatedLocs);
  }

  return updated;
}

export function resetFacilityServicesCatalog() {
  saveFacilityServicesCatalog([]);
  return [];
}

export function resetFacilitiesData() {
  saveOrganizations([]);
  saveLocations([]);
  saveFacilityResourceTypes([]);
  saveFacilityServicesCatalog([]);
  return {
    organizations: [],
    locations: [],
    resourceTypes: [],
    servicesCatalog: []
  };
}

export async function loadFacilitiesFromFhir() {
  const [orgs, locs, resourceBlob, servicesBlob] = await Promise.all([
    loadKindOrNative('Organization', 'organization', mapNativeOrganization),
    loadKindOrNative('Location', 'location', mapNativeLocation),
    loadConfigBlob('facility-resource-types'),
    loadConfigBlob('facility-services-catalog')
  ]);

  const organizations = preferRemote(orgs, getOrganizations());
  const orgKeys = new Set(organizations.flatMap((org) => [org.id, org.fhirId]).filter(Boolean));
  const rawLocations = preferRemote(locs, getLocations());
  const locations = (rawLocations || []).filter((loc) => {
    if (!loc) return false;
    if (String(loc.id || '').startsWith('loc-yeshua') || loc.kind === 'site') return true;
    if (loc.areaType && orgKeys.has(loc.organizationId)) return true;
    return orgKeys.has(loc.organizationId);
  });
  saveOrganizations(organizations);
  saveLocations(locations);

  if (resourceBlob) {
    resourceTypesFhirId = resourceBlob.fhirId;
    localStorage.setItem(RESOURCE_TYPES_STORAGE_KEY, JSON.stringify(resourceBlob.data || []));
  }
  if (servicesBlob) {
    servicesCatalogFhirId = servicesBlob.fhirId;
    localStorage.setItem(SERVICES_CATALOG_STORAGE_KEY, JSON.stringify(servicesBlob.data || []));
  }

  return {
    organizations,
    locations,
    resourceTypes: getFacilityResourceTypes(),
    servicesCatalog: getFacilityServicesCatalog()
  };
}
