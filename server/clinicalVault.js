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
      walkMarkdownFiles(full, acc);
      return;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
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
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function noteTags(meta) {
  const tags = meta.tags;
  if (Array.isArray(tags)) return tags.map((t) => String(t).toLowerCase());
  if (typeof tags === 'string') return tags.split(/[,\s]+/).map((t) => t.toLowerCase()).filter(Boolean);
  return [];
}

const MODALITY_ALIASES = {
  tcm: ['tcm', 'mtc'],
  acupuncture: ['acupuncture', 'acupuntura', 'mtc', 'tcm'],
  stem_cells: ['stem_cells', 'celulas_madre', 'stem-cells'],
  homeopathy: ['homeopathy', 'homeopatia'],
  iridology: ['iridology', 'iridologia'],
  biodescodification: ['biodescodification', 'biodescodificacion', 'biodecoding', 'biodecodificacion'],
  ayurveda: ['ayurveda'],
  functional: ['functional', 'medicina_funcional']
};

function expandModalityAliases(modalities) {
  return (modalities || []).flatMap((mod) => {
    if (mod && typeof mod === 'object') {
      return Array.isArray(mod.aliases) ? mod.aliases : [mod.id];
    }
    const key = String(mod || '').toLowerCase();
    return MODALITY_ALIASES[key] || [key];
  }).map((alias) => String(alias).toLowerCase());
}

function modalityMatches(tags, modalities) {
  const aliases = expandModalityAliases(modalities);
  if (!aliases.length) return true;
  const set = new Set(tags);
  if (set.has('general')) return true;
  return aliases.some((alias) => set.has(alias));
}

export function loadVaultNotes(vaultPath) {
  const files = walkMarkdownFiles(vaultPath);
  return files.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const relative = path.relative(vaultPath, filePath).replace(/\\/g, '/');
    const title = meta.title || body.match(/^#\s+(.+)$/m)?.[1] || relative;
    return {
      file: relative,
      title,
      condition: meta.condition || '',
      tags: noteTags(meta),
      body,
      text: `${title}\n${meta.description || ''}\n${meta.condition || ''}\n${body}`
    };
  });
}

export function rankVaultNotes(notes, diagnosisText, modalitySpecs, limit = 5) {
  const queryTokens = tokenize(diagnosisText);
  const filtered = notes.filter((note) => modalityMatches(note.tags, modalitySpecs));
  const scored = filtered.map((note) => {
    const haystack = tokenize(note.text);
    const haySet = new Set(haystack);
    let overlap = 0;
    queryTokens.forEach((token) => {
      if (haySet.has(token)) overlap += 1;
    });
    const titleBoost = tokenize(`${note.title} ${note.condition}`).some((t) => queryTokens.includes(t)) ? 3 : 0;
    return { ...note, score: overlap + titleBoost };
  });
  return scored
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function excerptForPrompt(note, maxChars = 1800) {
  const cleaned = String(note.body || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}…`;
}
