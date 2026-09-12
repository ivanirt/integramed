/**
 * Clinic-wide sidebar menu visibility (which modules appear in the left nav).
 */

const STORAGE_KEY = 'integramed_menu_capabilities';
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
  return merged;
}

export function setMenuCapabilityVisible(id, visible) {
  const current = getMenuCapabilities();
  return saveMenuCapabilities({ ...current, [id]: Boolean(visible) });
}
