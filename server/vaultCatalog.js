import fs from 'fs';
import path from 'path';
import {
  loadVaultNotes,
  extractWikilinks,
  invalidateVaultCache,
  rankVaultNotes
} from './clinicalVault.js';
import { noteIsEnabled } from './vaultSettings.js';

const SKIP_AUTOLINK_TITLES = new Set([
  'vault', 'playbook', 'readme', 'index', 'fuente', 'source', 'tono', 'disclaimer'
]);

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.md$/i, '')
    .replace(/[_/\\-]+/g, ' ')
    .trim();
}

function fileStem(file) {
  return path.basename(file, '.md');
}

export function collectSources(notes) {
  const map = new Map();
  notes.forEach((note) => {
    (note.sources || []).forEach((source) => {
      if (!source?.id) return;
      const current = map.get(source.id) || {
        id: source.id,
        title: source.title,
        author: source.author,
        date: source.date,
        url: source.url,
        resource: source.resource,
        topics: new Set(),
        noteCount: 0
      };
      current.title = current.title || source.title;
      current.author = current.author || source.author;
      current.date = current.date || source.date;
      current.url = current.url || source.url;
      if (note.topic) current.topics.add(note.topic);
      current.noteCount += 1;
      map.set(source.id, current);
    });
  });
  return [...map.values()].map((source) => ({
    ...source,
    topics: [...source.topics]
  })).sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

export function serializeNote(note) {
  return {
    file: note.file,
    title: note.title,
    type: note.type,
    topic: note.topic,
    description: note.description,
    author: note.author,
    date: note.date,
    tags: note.tags,
    sources: note.sources,
    wikilinks: note.wikilinks,
    clinicalCard: note.clinicalCard
  };
}

function resolveLinkTarget(target, notes) {
  const wanted = normalizeKey(target);
  const byFile = notes.find((note) => normalizeKey(note.file) === wanted || normalizeKey(note.file.replace(/\.md$/i, '')) === wanted);
  if (byFile) return byFile;
  const byStem = notes.find((note) => normalizeKey(fileStem(note.file)) === wanted || normalizeKey(fileStem(note.file)) === normalizeKey(target.split('/').pop()));
  if (byStem) return byStem;
  return notes.find((note) => normalizeKey(note.title) === wanted) || null;
}

export function buildLinkGraph(notes) {
  const outbound = {};
  const inbound = {};
  const broken = [];

  notes.forEach((note) => {
    outbound[note.file] = [];
    inbound[note.file] = inbound[note.file] || [];
  });

  notes.forEach((note) => {
    (note.wikilinks || extractWikilinks(note.body)).forEach((link) => {
      const resolved = resolveLinkTarget(link.target, notes);
      if (!resolved) {
        broken.push({ from: note.file, target: link.target, label: link.label });
        return;
      }
      outbound[note.file].push({ file: resolved.file, title: resolved.title, label: link.label });
      inbound[resolved.file] = inbound[resolved.file] || [];
      inbound[resolved.file].push({ file: note.file, title: note.title, label: link.label });
    });
  });

  return { outbound, inbound, broken };
}

function stripProtectedSpans(body) {
  return String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[\[[^\]]+\]\]/g, ' ');
}

export function suggestAutoLinks(notes) {
  const candidates = notes
    .filter((note) => note.title && !SKIP_AUTOLINK_TITLES.has(normalizeKey(note.title)))
    .map((note) => ({
      note,
      phrase: note.title,
      key: normalizeKey(note.title),
      href: note.file.replace(/\.md$/i, '')
    }))
    .filter((item) => item.phrase.length >= 6)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const suggestions = [];
  notes.forEach((note) => {
    const hay = stripProtectedSpans(note.body);
    const hayNorm = normalizeKey(hay);
    const already = new Set((note.wikilinks || []).map((link) => normalizeKey(link.target.split('/').pop())));
    candidates.forEach((candidate) => {
      if (candidate.note.file === note.file) return;
      if (already.has(normalizeKey(fileStem(candidate.note.file))) || already.has(candidate.key)) return;
      if (!hayNorm.includes(candidate.key)) return;
      suggestions.push({
        file: note.file,
        title: note.title,
        phrase: candidate.phrase,
        target: candidate.href,
        targetTitle: candidate.note.title
      });
    });
  });
  return suggestions;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyAutoLinks(vaultPath, notes, selected) {
  const byFile = new Map(notes.map((note) => [note.file, note]));
  const grouped = new Map();
  (selected || []).forEach((item) => {
    if (!grouped.has(item.file)) grouped.set(item.file, []);
    grouped.get(item.file).push(item);
  });

  const written = [];
  grouped.forEach((items, relative) => {
    const abs = path.join(vaultPath, relative);
    if (!fs.existsSync(abs)) return;
    let raw = fs.readFileSync(abs, 'utf8');
    items.forEach((item) => {
      const link = `[[${item.target}|${item.phrase}]]`;
      const re = new RegExp(`(?<!\\[\\[)${escapeRegExp(item.phrase)}(?!\\]\\])`);
      if (re.test(raw)) raw = raw.replace(re, link);
    });
    fs.writeFileSync(abs, raw, 'utf8');
    written.push(relative);
  });
  invalidateVaultCache(vaultPath);
  return { written, skipped: (selected || []).filter((item) => !byFile.has(item.file)).map((item) => item.file) };
}

function claimsFromNote(note) {
  const text = `${note.title}\n${note.body}`.toLowerCase();
  return {
    file: note.file,
    title: note.title,
    pregnancyAvoid: /embarazo.{0,40}(evitar|contraindic|no\s+usar|exclusion)/i.test(text) || /avoid.{0,20}pregnan/i.test(text),
    pregnancyOk: /embarazo.{0,40}(seguro|compatible|se\s+puede)/i.test(text) || /safe.{0,20}pregnan/i.test(text),
    childrenAvoid: /ni[ñn]os?.{0,30}(evitar|no\s+usar)/i.test(text),
    childrenOk: /ni[ñn]os?.{0,30}(seguro|se\s+puede)/i.test(text),
    noDose: /no posolog/i.test(text),
    dose: (text.match(/\b(\d+[\d.,]*\s*(mg|g|ml|mcg|µg|gotas?|drops?))\b/gi) || []).slice(0, 4)
  };
}

export function reviewCongruence(notes) {
  const groups = new Map();
  notes.forEach((note) => {
    const key = normalizeKey(note.title);
    if (!key || key.length < 4) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(note);
  });

  const issues = [];
  groups.forEach((group) => {
    if (group.length < 2) return;
    const claims = group.map(claimsFromNote);
    const files = group.map((note) => ({ file: note.file, title: note.title }));
    if (claims.some((c) => c.pregnancyAvoid) && claims.some((c) => c.pregnancyOk)) {
      issues.push({
        severity: 'conflict',
        code: 'pregnancy',
        title: group[0].title,
        detail: 'Una nota evita embarazo y otra lo da por compatible.',
        files
      });
    }
    if (claims.some((c) => c.childrenAvoid) && claims.some((c) => c.childrenOk)) {
      issues.push({
        severity: 'conflict',
        code: 'children',
        title: group[0].title,
        detail: 'Discrepancia sobre uso en niños.',
        files
      });
    }
    const doseSets = claims.filter((c) => c.dose.length);
    if (doseSets.length >= 2) {
      const joined = doseSets.map((c) => c.dose.join('|')).sort();
      if (new Set(joined).size > 1) {
        issues.push({
          severity: 'review',
          code: 'dose',
          title: group[0].title,
          detail: 'Las dosis citadas no coinciden entre notas del mismo tema.',
          files,
          doses: doseSets.map((c) => ({ file: c.file, dose: c.dose }))
        });
      }
    }
  });

  const graph = buildLinkGraph(notes);
  if (graph.broken.length) {
    issues.push({
      severity: 'info',
      code: 'broken-links',
      title: 'Wikilinks sin destino',
      detail: `${graph.broken.length} enlaces no resuelven a una nota.`,
      broken: graph.broken.slice(0, 40)
    });
  }

  return issues;
}

export function searchVault(notes, query, disabledIds) {
  const enabled = notes.filter((note) => noteIsEnabled(note, disabledIds));
  const ranked = rankVaultNotes(enabled, query, [], 12, { strict: true });
  return ranked.map((note) => ({
    ...serializeNote(note),
    score: note.score,
    excerpt: String(note.body || '').replace(/\s+/g, ' ').trim().slice(0, 280)
  }));
}

export function readNoteFile(vaultPath, relative) {
  const safe = String(relative || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!safe || safe.includes('..')) throw new Error('Ruta de nota no válida');
  const abs = path.join(vaultPath, safe);
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(path.resolve(vaultPath))) throw new Error('Ruta de nota no válida');
  if (!fs.existsSync(resolved)) return null;
  return {
    file: safe,
    content: fs.readFileSync(resolved, 'utf8')
  };
}

export function listExportFiles(notes, files) {
  if (!files?.length) return notes;
  const wanted = new Set(files.map((file) => String(file).replace(/\\/g, '/')));
  return notes.filter((note) => wanted.has(note.file));
}
