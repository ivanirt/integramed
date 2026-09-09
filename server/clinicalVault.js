import fs from 'fs';
import path from 'path';

const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'del', 'las', 'los', 'un', 'una', 'con', 'por', 'para',
  'the', 'and', 'of', 'to', 'in', 'or', 'es', 'que', 'se', 'su', 'al'
]);

export function parseFrontmatter(raw) {
  const match = String(raw || '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: String(raw || '') };
  const yaml = match[1];
  const body = match[2] || '';
  const meta = {};
  let listKey = null;
  yaml.split(/\r?\n/).forEach((line) => {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      meta[listKey] = Array.isArray(meta[listKey]) ? meta[listKey] : [];
      meta[listKey].push(listItem[1].replace(/^['"]|['"]$/g, '').trim());
      return;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) return;
    listKey = null;
    const key = kv[1];
    let value = kv[2].trim();
    if (value === '') {
      listKey = key;
      meta[key] = [];
      return;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      return;
    }
    meta[key] = value.replace(/^['"]|['"]$/g, '');
  });
  return { meta, body };
}

function walkMarkdownFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) return;
      walkMarkdownFiles(full, acc);
      return;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      if (entry.name.startsWith('_')) return;
      acc.push(full);
    }
  });
  return acc;
}

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => {
      if (!token || STOPWORDS.has(token)) return false;
      if (/\d/.test(token)) return token.length >= 2;
      return token.length > 2;
    });
}

function normalizeTag(tag) {
  return String(tag || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, '_');
}

function noteTags(meta) {
  const tags = meta.tags;
  if (Array.isArray(tags)) return tags.map(normalizeTag).filter(Boolean);
  if (typeof tags === 'string') return tags.split(/[,\s]+/).map(normalizeTag).filter(Boolean);
  return [];
}

function inferPathTags(relativePath) {
  const p = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
  const tags = [];
  if (p.includes('boericke') || p.includes('homeopath') || p.includes('homeopat') || /(^|\/)remedies\//.test(p)) {
    tags.push('homeopathy', 'homeopatia', 'boericke');
  }
  if (p.includes('acupuntur') || p.includes('medicina-china') || p.includes('padilla') || /(^|\/)tcm(\/|$)/.test(p)) {
    tags.push('tcm', 'mtc', 'acupuncture', 'acupuntura');
  }
  if (p.includes('biodescod')) {
    tags.push('biodescodification', 'biodescodificacion');
  }
  if (p.includes('celulas-madre') || p.includes('celulas_madre') || p.includes('stem_cell') || p.includes('stem-cell')) {
    tags.push('stem_cells', 'celulas_madre', 'stem_cells');
  }
  if (p.includes('iridol')) {
    tags.push('iridology', 'iridologia');
  }
  if (p.includes('ayurveda')) {
    tags.push('ayurveda');
  }
  if (p.includes('peptide') || p.includes('herbalismo') || p.includes('herbal')) {
    tags.push('functional', 'medicina_funcional', 'peptides');
  }
  if (p.startsWith('condiciones/') || p.includes('/condiciones/')) {
    tags.push('general');
  }
  return tags;
}

function yamlSearchText(meta = {}) {
  const parts = [];
  ['name', 'common', 'abbreviation', 'title', 'description', 'condition', 'dose_boericke'].forEach((key) => {
    if (meta[key]) parts.push(String(meta[key]));
  });
  ['sphere', 'modalities_worse', 'modalities_better', 'compare', 'complementary', 'antidotes', 'tags'].forEach((key) => {
    const value = meta[key];
    if (Array.isArray(value)) parts.push(value.join(' '));
  });
  return parts.join('\n');
}

const MODALITY_ALIASES = {
  tcm: ['tcm', 'mtc', 'acupuntura', 'acupuncture', 'medicina_tradicional_china'],
  acupuncture: ['acupuncture', 'acupuntura', 'mtc', 'tcm'],
  stem_cells: ['stem_cells', 'celulas_madre', 'regen_med'],
  homeopathy: ['homeopathy', 'homeopatia', 'boericke', 'homoeopathic', 'materia_medica'],
  iridology: ['iridology', 'iridologia'],
  biodescodification: ['biodescodification', 'biodescodificacion', 'biodecoding', 'biodecodificacion'],
  ayurveda: ['ayurveda'],
  functional: ['functional', 'medicina_funcional', 'peptides', 'herbalismo', 'herbal']
};

function expandModalityAliases(modalities) {
  return (modalities || []).flatMap((mod) => {
    if (mod && typeof mod === 'object') {
      return Array.isArray(mod.aliases) ? mod.aliases : [mod.id];
    }
    const key = normalizeTag(mod);
    return MODALITY_ALIASES[key] || [key];
  }).map((alias) => normalizeTag(alias));
}

function modalityMatches(tags, modalities) {
  const aliases = expandModalityAliases(modalities);
  if (!aliases.length) return true;
  const set = new Set(tags);
  if (set.has('general')) return true;
  return aliases.some((alias) => set.has(alias));
}

const notesCache = new Map();

export function normalizeVaultLanguage(lang) {
  return String(lang || '').toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function resolveVaultPath(lang, projectRoot) {
  const normalized = normalizeVaultLanguage(lang);
  const envKey = normalized === 'en' ? 'CLINICAL_VAULT_EN_PATH' : 'CLINICAL_VAULT_ES_PATH';
  if (process.env[envKey]) return path.resolve(process.env[envKey]);

  const named = path.resolve(projectRoot, `vault-${normalized}`);
  if (fs.existsSync(named)) return named;

  if (process.env.CLINICAL_VAULT_PATH) return path.resolve(process.env.CLINICAL_VAULT_PATH);
  return path.resolve(projectRoot, 'vault');
}

export function loadVaultNotes(vaultPath) {
  if (notesCache.has(vaultPath)) return notesCache.get(vaultPath);
  const files = walkMarkdownFiles(vaultPath);
  const notes = files.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const relative = path.relative(vaultPath, filePath).replace(/\\/g, '/');
    const title = meta.title || meta.name || body.match(/^#\s+(.+)$/m)?.[1] || relative;
    const tags = [...new Set([...noteTags(meta), ...inferPathTags(relative)])];
    return {
      file: relative,
      title,
      condition: meta.condition || meta.common || '',
      tags,
      body,
      text: `${title}\n${relative}\n${yamlSearchText(meta)}\n${body}`
    };
  });
  notesCache.set(vaultPath, notes);
  return notes;
}

function normalizeSearchText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_/-]+/g, ' ');
}

function scoreNoteAgainstQuery(note, queryText) {
  const query = String(queryText || '').trim();
  if (!query) return 0;
  const queryNorm = normalizeSearchText(query);
  const queryTokens = tokenize(query);
  const titleNorm = normalizeSearchText(`${note.title} ${note.condition} ${note.file}`);
  const hayNorm = normalizeSearchText(note.text);
  const haySet = new Set(tokenize(`${note.text} ${note.file}`));
  let score = 0;
  queryTokens.forEach((token) => {
    if (haySet.has(token)) score += 1;
    if (titleNorm.includes(token)) score += 3;
  });
  if (queryNorm.length >= 3 && titleNorm.includes(queryNorm)) score += 8;
  queryNorm.split(/\s+/).forEach((word) => {
    if (word.length < 4) return;
    if (titleNorm.includes(word)) score += 4;
    else if (hayNorm.includes(word)) score += 1;
  });
  return score;
}

export function rankVaultNotes(notes, diagnosisText, modalitySpecs, limit = 5) {
  const filtered = notes.filter((note) => modalityMatches(note.tags, modalitySpecs));
  const queries = String(diagnosisText || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const searchQueries = queries.length ? queries : [String(diagnosisText || '').trim()].filter(Boolean);

  const scored = filtered.map((note) => {
    const score = searchQueries.reduce((sum, query) => sum + scoreNoteAgainstQuery(note, query), 0);
    return { ...note, score };
  });
  const ranked = scored
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (ranked.length > 0) return ranked;

  const fallback = filtered
    .slice()
    .sort((a, b) => {
      const rank = (file) => {
        const f = file.toLowerCase();
        if (f.includes('condiciones/')) return 0;
        if (f.includes('keynotes')) return 1;
        if (f.includes('playbook')) return 2;
        if (f.includes('by-system')) return 3;
        if (f.includes('/remedies/')) return 4;
        return 5;
      };
      return rank(a.file) - rank(b.file);
    })
    .slice(0, limit)
    .map((note) => ({ ...note, score: 1 }));
  return fallback;
}

export function excerptForPrompt(note, maxChars = 1800) {
  const cleaned = String(note.body || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}…`;
}
