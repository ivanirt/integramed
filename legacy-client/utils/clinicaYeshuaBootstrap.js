/**
 * Idempotent FHIR bootstrap for Clínica Yeshua (real clinic record, not demo seed).
 */
import {
  persistOrganization,
  persistLocation,
  saveFacilityServicesCatalog,
  getOrganizations,
  getLocations,
  getFacilityServicesCatalog
} from './facilityStorage.js';
import { getStaffList, persistStaffMember, getStaffFullName } from './staffStorage.js';
import { getClinicalServices, saveClinicalService } from './clinicalServicesStorage.js';
import { upsertPractitionerRole } from '../services/fhirApi.js';

export const YESHUA_ORG_ID = 'org-clinica-yeshua';
export const YESHUA_SITE_ID = 'loc-yeshua-naucalpan';

const ADDRESS = {
  line: 'Oficinas Naucalpan LC Corporativo, Av. México 46, piso 2',
  district: 'Fraccionamiento las Américas',
  city: 'Naucalpan de Juárez',
  state: 'Estado de México',
  postalCode: '53040',
  country: 'México'
};

const SERVICES = [
  'Consulta general',
  'Consulta homeopatía',
  'Consulta fisioterapia',
  'Curación heridas',
  'Terapia Ozono',
  'Terapia Regenerativa Células Madre'
];

const AREAS = [
  {
    id: 'loc-yeshua-consultorio-1',
    name: 'Consultorio 1',
    areaType: 'consultation',
    typeName: 'Consultorio',
    services: ['Consulta general', 'Consulta homeopatía', 'Terapia Ozono', 'Terapia Regenerativa Células Madre'],
    practitionerIds: ['staff-jesus-robledo']
  },
  {
    id: 'loc-yeshua-consultorio-2',
    name: 'Consultorio 2',
    areaType: 'consultation',
    typeName: 'Consultorio',
    services: ['Consulta homeopatía'],
    practitionerIds: []
  },
  {
    id: 'loc-yeshua-fisioterapia',
    name: 'Consultorio fisioterapia',
    areaType: 'therapy',
    typeName: 'Terapia',
    services: ['Consulta fisioterapia'],
    practitionerIds: ['staff-edgar', 'staff-ivan-renteria']
  },
  {
    id: 'loc-yeshua-sala-heridas',
    name: 'Sala heridas',
    areaType: 'procedure',
    typeName: 'Procedimientos',
    services: ['Curación heridas'],
    practitionerIds: ['staff-lluvia']
  }
];

const STAFF = [
  {
    id: 'staff-jesus-robledo',
    givenName: 'Jesús',
    familyName: 'Robledo',
    prefix: 'Dr.',
    gender: 'male',
    email: 'jesus.robledo@integramed.com',
    roles: ['doctor', 'admin'],
    primaryRole: 'doctor',
    specialty: 'Consulta general, homeopatía, terapia ozono y medicina regenerativa',
    consultingRoom: 'Consultorio 1',
    organizationId: YESHUA_ORG_ID,
    locationId: 'loc-yeshua-consultorio-1'
  },
  {
    id: 'staff-lluvia',
    givenName: 'Lluvia',
    familyName: '',
    prefix: 'Enf.',
    gender: 'female',
    email: 'lluvia@clinicayeshua.mx',
    roles: ['nurse'],
    primaryRole: 'nurse',
    specialty: 'Enfermería y curación de heridas',
    consultingRoom: 'Sala heridas',
    organizationId: YESHUA_ORG_ID,
    locationId: 'loc-yeshua-sala-heridas'
  },
  {
    id: 'staff-edgar',
    givenName: 'Edgar',
    familyName: '',
    prefix: 'Lic.',
    gender: 'male',
    email: 'edgar@clinicayeshua.mx',
    roles: ['therapist'],
    primaryRole: 'therapist',
    specialty: 'Fisioterapia',
    consultingRoom: 'Consultorio fisioterapia',
    organizationId: YESHUA_ORG_ID,
    locationId: 'loc-yeshua-fisioterapia'
  },
  {
    id: 'staff-edith-alvarez',
    givenName: 'Edith',
    familyName: 'Alvarez',
    prefix: 'Lic.',
    gender: 'female',
    email: 'edith.alvarez@clinicayeshua.mx',
    roles: ['receptionist'],
    primaryRole: 'receptionist',
    specialty: 'Asistente clínica',
    consultingRoom: 'Recepción',
    organizationId: YESHUA_ORG_ID,
    locationId: YESHUA_SITE_ID
  },
  {
    id: 'staff-ivan-renteria',
    givenName: 'Ivan',
    familyName: 'Renteria',
    prefix: 'Lic.',
    gender: 'male',
    email: 'ivan_renteria@integramed.com',
    roles: ['therapist'],
    primaryRole: 'therapist',
    specialty: 'Fisioterapia',
    consultingRoom: 'Consultorio fisioterapia',
    organizationId: YESHUA_ORG_ID,
    locationId: 'loc-yeshua-fisioterapia'
  }
];

function mergeById(existing, next) {
  if (!existing) return next;
  return {
    ...next,
    ...existing,
    fhirId: existing.fhirId || next.fhirId,
    address: existing.address?.line ? existing.address : next.address,
    services: existing.services?.length ? existing.services : next.services,
    practitionerIds: existing.practitionerIds?.length ? existing.practitionerIds : next.practitionerIds
  };
}

function isOwnedYeshuaOrg(org) {
  if (!org) return false;
  if (org.id === YESHUA_ORG_ID) return true;
  const city = String(org.address?.city || '').toLowerCase();
  return String(org.name || '').toLowerCase() === 'clínica yeshua' && city.includes('naucalpan');
}

export async function ensureClinicaYeshua() {
  const existingOrg = getOrganizations().find((org) => isOwnedYeshuaOrg(org));

  await persistOrganization(mergeById(existingOrg, {
    id: YESHUA_ORG_ID,
    fhirId: existingOrg?.id === YESHUA_ORG_ID ? existingOrg.fhirId : undefined,
    name: 'Clínica Yeshua',
    alias: 'Clínica Yeshua',
    type: 'prov',
    typeName: 'Clínica de servicios médicos',
    director: 'Dr. Jesús Robledo',
    status: 'active',
    logoBg: '#0f766e',
    logoText: '#ffffff',
    address: ADDRESS
  }));

  const org = getOrganizations().find((item) => item.id === YESHUA_ORG_ID);
  const orgId = YESHUA_ORG_ID;

  const existingSite = getLocations().find((loc) => loc.id === YESHUA_SITE_ID);
  await persistLocation({
    ...mergeById(existingSite, {
      id: YESHUA_SITE_ID,
      code: 'YESHUA-NAU',
      name: 'Oficinas Naucalpan',
      description: 'Sede LC Corporativo, piso 2',
      kind: 'site',
      areaType: 'other',
      typeName: 'Sede',
      status: 'active',
      address: ADDRESS
    }),
    id: YESHUA_SITE_ID,
    organizationId: orgId,
    kind: 'site',
    address: ADDRESS
  });

  const site = getLocations().find((loc) => loc.id === YESHUA_SITE_ID);

  for (const area of AREAS) {
    const existing = getLocations().find((loc) => loc.id === area.id);
    const merged = mergeById(existing, area);
    await persistLocation({
      ...merged,
      id: area.id,
      organizationId: orgId,
      kind: 'area',
      status: 'active',
      address: ADDRESS,
      practitionerIds: Array.from(new Set([...(merged.practitionerIds || []), ...(area.practitionerIds || [])])),
      partOfId: YESHUA_SITE_ID,
      partOfFhirId: site?.fhirId,
      partOfName: site?.name
    });
  }

  const catalog = Array.from(new Set([...getFacilityServicesCatalog(), ...SERVICES]));
  saveFacilityServicesCatalog(catalog);

  const clinical = getClinicalServices();
  for (const name of SERVICES) {
    const id = `serv-yeshua-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const existing = clinical.find((item) => item.id === id || item.nameEs === name);
    const areaIds = AREAS.filter((area) => area.services.includes(name))
      .map((area) => getLocations().find((loc) => loc.id === area.id)?.fhirId)
      .filter(Boolean);
    saveClinicalService({
      id: existing?.id || id,
      fhirId: existing?.fhirId,
      nameEs: name,
      nameEn: name,
      category: 'consulta_especialidad',
      department: 'Clínica Yeshua',
      status: 'available',
      requiresAppointment: true,
      organizationFhirId: org?.fhirId,
      organizationName: org?.name,
      locationFhirIds: areaIds
    });
  }

  for (const member of STAFF) {
    const existing = getStaffList().find((item) => item.id === member.id || item.email === member.email);
    await persistStaffMember({
      preferredLanguage: 'es',
      status: 'active',
      avatarBg: member.primaryRole === 'doctor' ? '#0f766e' : member.primaryRole === 'nurse' ? '#be123c' : member.primaryRole === 'therapist' ? '#0284c7' : '#d97706',
      avatarText: '#ffffff',
      ...mergeById(existing, member)
    });
  }

  const orgFresh = getOrganizations().find((item) => item.id === orgId);
  for (const member of STAFF) {
    const staff = getStaffList().find((item) => item.id === member.id);
    const loc = getLocations().find((item) => item.id === member.locationId);
    if (!staff?.fhirId || !orgFresh?.fhirId) continue;
    try {
      await upsertPractitionerRole({
        practitionerFhirId: staff.fhirId,
        practitionerName: getStaffFullName(staff),
        organizationFhirId: orgFresh.fhirId,
        organizationName: orgFresh.name,
        locationFhirId: loc?.fhirId,
        locationName: loc?.name,
        role: member.primaryRole,
        specialties: loc?.services || (member.specialty ? [member.specialty] : [])
      });
    } catch (err) {
      console.info('FHIR PractitionerRole sync skipped:', err.message);
    }
  }

  return {
    organizations: getOrganizations(),
    locations: getLocations(),
    staff: getStaffList()
  };
}
