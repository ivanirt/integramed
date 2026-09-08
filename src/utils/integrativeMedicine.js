export const INTEGRATIVE_MODALITIES = [
  {
    id: 'tcm',
    labelEs: 'Medicina tradicional china',
    labelEn: 'Traditional Chinese medicine',
    aliases: ['tcm', 'mtc']
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
    aliases: ['stem_cells', 'celulas_madre', 'stem-cells']
  },
  {
    id: 'homeopathy',
    labelEs: 'Homeopatía',
    labelEn: 'Homeopathy',
    aliases: ['homeopathy', 'homeopatia']
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
    aliases: ['functional', 'medicina_funcional']
  }
];

const AI_SECRETS_KEY = 'integramed_ai_secrets';

function readSecretsMap() {
  try {
    const raw = localStorage.getItem(AI_SECRETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getStaffAiSecrets(staffId) {
  if (!staffId) return { aiApiKey: '', aiBaseUrl: 'https://api.openai.com/v1', aiModel: 'gpt-4o-mini' };
  const map = readSecretsMap();
  const saved = map[staffId] || {};
  return {
    aiApiKey: saved.aiApiKey || '',
    aiBaseUrl: saved.aiBaseUrl || 'https://api.openai.com/v1',
    aiModel: saved.aiModel || 'gpt-4o-mini'
  };
}

export function saveStaffAiSecrets(staffId, secrets) {
  if (!staffId) return;
  const map = readSecretsMap();
  map[staffId] = {
    aiApiKey: secrets.aiApiKey || '',
    aiBaseUrl: secrets.aiBaseUrl || 'https://api.openai.com/v1',
    aiModel: secrets.aiModel || 'gpt-4o-mini'
  };
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
