/**
 * Clinic-wide sidebar menu visibility (which modules appear in the left nav).
 * Cached locally; persisted on FHIR as a List config blob.
 */

import { loadConfigBlob, saveConfigBlob } from '../services/fhirPayloadStore.js';

const STORAGE_KEY = 'integramed_menu_capabilities_fhir';
let menuCapabilitiesFhirId = null;
export const MENU_CAPABILITIES_EVENT = 'integramed_menu_capabilities_updated';

export const MENU_CAPABILITY_ITEMS = [
  { id: 'home', path: '/', labelEs: 'Inicio', labelEn: 'Home' },
  { id: 'agenda', path: '/agenda', labelEs: 'Agenda', labelEn: 'Agenda' },
  { id: 'patients', path: '/patients', labelEs: 'Pacientes', labelEn: 'Patients' },
  { id: 'consulta', path: '/consulta', labelEs: 'Consulta', labelEn: 'Consultations' },
  { id: 'practitioners', path: '/practitioners', labelEs: 'Personal', labelEn: 'Staff' },
  { id: 'inventory', path: '/inventario', labelEs: 'Farmacia', labelEn: 'Pharmacy' },
  { id: 'labs', path: '/laboratorios', labelEs: 'Laboratorios', labelEn: 'Laboratories' },
  { id: 'prescriptions', path: '/recetas', labelEs: 'Recetas', labelEn: 'Prescriptions' },
  { id: 'vault', path: '/boveda', labelEs: 'Bóveda de contexto', labelEn: 'Context vault' }
];

function defaultCapabilities() {
  return MENU_CAPABILITY_ITEMS.reduce((acc, item) => {
    acc[item.id] = true;
    return acc;
  }, {});
}

export function getMenuCapabilities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCapabilities();
    const parsed = JSON.parse(raw);
    return { ...defaultCapabilities(), ...parsed };
  } catch {
    return defaultCapabilities();
  }
}

export function isMenuCapabilityVisible(id) {
  const caps = getMenuCapabilities();
  if (id === 'settings' || id === 'profile') return true;
  return caps[id] !== false;
}

export function saveMenuCapabilities(next) {
  const merged = { ...defaultCapabilities(), ...next };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event(MENU_CAPABILITIES_EVENT));
  saveConfigBlob('menu-capabilities', merged, menuCapabilitiesFhirId)
    .then((id) => { menuCapabilitiesFhirId = id; })
    .catch((err) => console.info('FHIR menu capabilities sync skipped:', err.message));
  return merged;
}

export async function loadMenuCapabilitiesFromFhir() {
  const blob = await loadConfigBlob('menu-capabilities');
  if (blob === null) return getMenuCapabilities();
  if (blob.data && typeof blob.data === 'object') {
    menuCapabilitiesFhirId = blob.fhirId;
    const merged = { ...defaultCapabilities(), ...blob.data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(MENU_CAPABILITIES_EVENT));
    return merged;
  }
  return getMenuCapabilities();
}

export function setMenuCapabilityVisible(id, visible) {
  const current = getMenuCapabilities();
  return saveMenuCapabilities({ ...current, [id]: Boolean(visible) });
}
