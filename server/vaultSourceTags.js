const SOURCE_KINDS = new Set([
  'book',
  'congress',
  'youtube',
  'notebooklm',
  'article',
  'vault',
  'file'
]);

const SKIP_TAGS = new Set([
  'alt-med',
  'alt_med',
  'okf',
  'draft',
  'reviewed'
]);

const DOMAIN_FROM_TAG = {
  ayurveda: 'ayurveda',
  homeopathy: 'homeopathy',
  homeopatia: 'homeopathy',
  homoeopathic: 'homeopathy',
  boericke: 'homeopathy',
  materia_medica: 'homeopathy',
  tcm: 'tcm',
  mtc: 'tcm',
  acupuncture: 'tcm',
  acupuntura: 'tcm',
  medicina_tradicional_china: 'tcm',
  biodescodification: 'biodescodification',
  biodescodificacion: 'biodescodification',
  biodecoding: 'biodescodification',
  stem_cells: 'stem_cells',
  celulas_madre: 'stem_cells',
  regen_med: 'stem_cells',
  iridology: 'iridology',
  iridologia: 'iridology',
  iris: 'iridology',
  functional: 'functional',
  medicina_funcional: 'functional',
  peptides: 'peptides',
  herbalismo: 'herbalismo',
  herbal: 'herbalismo',
  general: 'general',
  imported: 'imported',
  congress: 'congress',
  youtube: 'youtube',
  notebooklm: 'notebooklm',
  book: 'book',
  article: 'article',
  vault: 'vault',
  file: 'file'
};

function normalizeTag(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .trim();
}

export function inferSourceKind(entry = {}) {
  const declared = normalizeTag(entry.kind);
  if (SOURCE_KINDS.has(declared)) return declared;

  const blob = `${entry.id || ''} ${entry.title || ''} ${entry.url || ''} ${entry.resource || ''} ${entry.author || ''}`.toLowerCase();
  if (/youtube\.com|youtu\.be|\byoutube\b/.test(blob)) return 'youtube';
  if (/notebooklm|notebook_lm/.test(blob)) return 'notebooklm';
  if (/congress|congreso/.test(blob)) return 'congress';
  if (/inbox\/youtube/.test(blob)) return 'youtube';
  if (/inbox\/congress/.test(blob)) return 'congress';
  if (/inbox\/notebooklm/.test(blob)) return 'notebooklm';
  if (/inbox\/files/.test(blob)) return 'file';
  if (/vault-curation|process:grok|agent catalog|vault\//.test(blob)) return 'vault';
  if (/\.pdf\b|oceanofpdf|rsc 20|chemistry of medicinal|materia medica|boericke/.test(blob)) return 'book';
  if (/^https?:\/\//i.test(String(entry.url || entry.resource || ''))) return 'article';
  return 'book';
}

export function tagsForSource({ kind, noteTags = [] } = {}) {
  const tags = new Set();
  const resolvedKind = SOURCE_KINDS.has(kind) ? kind : inferSourceKind({ kind });
  if (resolvedKind) tags.add(resolvedKind);
  (noteTags || []).forEach((raw) => {
    const normalized = normalizeTag(raw);
    if (!normalized || SKIP_TAGS.has(normalized)) return;
    const mapped = DOMAIN_FROM_TAG[normalized];
    if (mapped) tags.add(mapped);
  });
  return [...tags];
}

export function mergeSourceTags(currentTags, extraTags) {
  const next = new Set(currentTags || []);
  (extraTags || []).forEach((tag) => next.add(tag));
  return [...next].sort((a, b) => a.localeCompare(b));
}

export function sourceMatchesTags(source, selectedTags) {
  if (!selectedTags?.length) return true;
  const tags = new Set(source?.tags || []);
  return selectedTags.every((tag) => tags.has(tag));
}

export function noteUsesSources(note, sourceIds) {
  if (!sourceIds?.length) return true;
  const allowed = new Set(sourceIds);
  const ids = (note.sources || []).map((source) => source.id).filter(Boolean);
  if (!ids.length) return false;
  return ids.some((id) => allowed.has(id));
}
