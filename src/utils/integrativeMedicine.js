export const INTEGRATIVE_MODALITIES = [
  {
    id: 'tcm',
    labelEs: 'Medicina tradicional china',
    labelEn: 'Traditional Chinese medicine',
    aliases: ['tcm', 'mtc', 'acupuntura', 'acupuncture', 'medicina_tradicional_china']
  },
  {
    id: 'acupuncture',
    labelEs: 'Acupuntura',
    labelEn: 'Acupuncture',
    aliases: ['acupuncture', 'acupuntura', 'mtc', 'tcm']
  },
  {
    id: 'stem_cells',
    labelEs: 'Células madre',
    labelEn: 'Stem cells',
    aliases: ['stem_cells', 'celulas_madre', 'stem-cells', 'regen_med']
  },
  {
    id: 'homeopathy',
    labelEs: 'Homeopatía',
    labelEn: 'Homeopathy',
    aliases: ['homeopathy', 'homeopatia', 'boericke', 'homoeopathic', 'materia_medica']
  },
  {
    id: 'iridology',
    labelEs: 'Iridología',
    labelEn: 'Iridology',
    aliases: ['iridology', 'iridologia']
  },
  {
    id: 'biodescodification',
    labelEs: 'Biodescodificación',
    labelEn: 'Biodescodification',
    aliases: ['biodescodification', 'biodescodificacion', 'biodecoding', 'biodecodificacion']
  },
  {
    id: 'ayurveda',
    labelEs: 'Ayurveda',
    labelEn: 'Ayurveda',
    aliases: ['ayurveda']
  },
  {
    id: 'functional',
    labelEs: 'Medicina funcional',
    labelEn: 'Functional medicine',
    aliases: ['functional', 'medicina_funcional', 'peptides', 'herbalismo', 'herbal']
  }
];

export const CLINIC_SEARCH_MODALITIES = [
  'tcm',
  'homeopathy',
  'stem_cells',
  'iridology',
  'biodescodification',
  'ayurveda',
  'functional'
];

const CLINIC_MODALITIES_KEY = 'integramed_clinic_integrative_modalities';
export const CLINIC_MODALITIES_EVENT = 'integramed_clinic_modalities_updated';

function defaultClinicModalities() {
  return CLINIC_SEARCH_MODALITIES.reduce((acc, id) => {
    acc[id] = true;
    return acc;
  }, {});
}

export function getClinicIntegrativeModalities() {
  try {
    const raw = localStorage.getItem(CLINIC_MODALITIES_KEY);
    if (!raw) return defaultClinicModalities();
    return { ...defaultClinicModalities(), ...JSON.parse(raw) };
  } catch {
    return defaultClinicModalities();
  }
}

export function isClinicIntegrativeModalityEnabled(id) {
  return getClinicIntegrativeModalities()[id] !== false;
}

export function saveClinicIntegrativeModalities(next) {
  const merged = { ...defaultClinicModalities(), ...next };
  localStorage.setItem(CLINIC_MODALITIES_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event(CLINIC_MODALITIES_EVENT));
  return merged;
}

export function setClinicIntegrativeModalityEnabled(id, enabled) {
  const current = getClinicIntegrativeModalities();
  return saveClinicIntegrativeModalities({ ...current, [id]: Boolean(enabled) });
}

export function getEnabledClinicModalityIds() {
  const flags = getClinicIntegrativeModalities();
  return CLINIC_SEARCH_MODALITIES.filter((id) => flags[id] !== false);
}

export function resolveSearchModalities(doctorModalityIds) {
  const clinicEnabled = getEnabledClinicModalityIds();
  const doctorSelected = Array.isArray(doctorModalityIds)
    ? doctorModalityIds.filter((id) => clinicEnabled.includes(id))
    : [];
  return doctorSelected.length > 0 ? doctorSelected : clinicEnabled;
}

const AI_SECRETS_KEY = 'integramed_ai_secrets';
export const DEFAULT_AI_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_AI_MODEL = 'openai/gpt-4o';

function readSecretsMap() {
  try {
    const raw = localStorage.getItem(AI_SECRETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function withAiDefaults(partial = {}) {
  const value = (key, fallback) => {
    const next = String(partial[key] || '').trim();
    return next || fallback;
  };
  return {
    aiApiKey: String(partial.aiApiKey || '').trim(),
    aiBaseUrl: value('aiBaseUrl', DEFAULT_AI_BASE_URL),
    aiModel: value('aiModel', DEFAULT_AI_MODEL)
  };
}

export function getStaffAiSecrets(staffId) {
  const map = readSecretsMap();
  const saved = staffId ? (map[staffId] || {}) : {};
  return withAiDefaults(saved);
}

export function saveStaffAiSecrets(staffId, secrets) {
  if (!staffId) return;
  const map = readSecretsMap();
  map[staffId] = withAiDefaults(secrets);
  try {
    localStorage.setItem(AI_SECRETS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not persist AI secrets locally', err);
  }
}

export function modalitySpecsFromIds(ids) {
  const selected = Array.isArray(ids) ? ids : [];
  return INTEGRATIVE_MODALITIES
    .filter((mod) => selected.includes(mod.id))
    .map((mod) => ({ id: mod.id, aliases: mod.aliases }));
}
