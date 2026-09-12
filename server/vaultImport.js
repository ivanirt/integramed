import fs from 'fs';
import path from 'path';
import { invalidateVaultCache } from './clinicalVault.js';

const KIND_FOLDERS = {
  congress: 'inbox/congress',
  youtube: 'inbox/youtube',
  notebooklm: 'inbox/notebooklm',
  file: 'inbox/files'
};

function slugify(text) {
  const slug = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `nota-${Date.now()}`;
}

function yamlQuote(value) {
  const text = String(value ?? '').replace(/"/g, '\\"');
  return `"${text}"`;
}

function extractTitleFromMarkdown(content, fallback) {
  const heading = String(content || '').match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/[*_`]/g, '').trim();
  return fallback;
}

function hasClinicalHeadings(content) {
  return /##\s*(Qu[eé]|What|Por qu[eé]|Why|C[oó]mo|How|Cu[aá]ndo|Dosis|Fuente|Source)/i.test(content);
}

function wrapClinicalBody({ title, body, author, date, originUrl, kind }) {
  if (hasClinicalHeadings(body)) return body.trim();
  const trimmed = String(body || '').trim();
  const first = trimmed.replace(/^#.*$/m, '').trim().slice(0, 600);
  return [
    `# ${title}`,
    '',
    '## Qué',
    title,
    '',
    '## Por qué',
    first || 'Importado para revisión clínica. Completar la intención terapéutica.',
    '',
    '## Cómo',
    'Pendiente de extraer el mecanismo o marco de la fuente.',
    '',
    '## Cuándo / Cuánto',
    'No posología en la fuente importada. Completar solo si el original la declara.',
    '',
    '## Fuente',
    `- ${author || 'autor no declarado'} · ${date || 'fecha no declarada'} · ${kind}`,
    originUrl ? `- Link: ${originUrl}` : '- Link: (añadir URL de la fuente)'
  ].join('\n');
}

function buildFrontmatter({ title, description, kind, author, date, originUrl, filename }) {
  const iso = date ? new Date(date).toISOString() : new Date().toISOString();
  const id = `${kind}-${slugify(title).toLowerCase()}`;
  return [
    '---',
    'type: SourceNote',
    `title: ${yamlQuote(title)}`,
    `description: ${yamlQuote(description)}`,
    'tags: [alt-med, imported, ' + kind + ']',
    'status: draft',
    `generated:`,
    '  by: process:integramed-vault-import',
    `  at: ${new Date().toISOString()}`,
    'sources:',
    `  - id: ${id}`,
    `    title: ${yamlQuote(title)}`,
    `    author: ${yamlQuote(author || 'unknown')}`,
    `    kind: ${kind}`,
    `    last_modified: ${iso}`,
    originUrl ? `    url: ${originUrl}` : `    resource: ${filename}`,
    '---',
    ''
  ].join('\n');
}

function uniquePath(dir, filename) {
  const ext = path.extname(filename) || '.md';
  const base = path.basename(filename, ext);
  let candidate = path.join(dir, `${base}${ext}`);
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}-${i}${ext}`);
    i += 1;
  }
  return candidate;
}

export function importVaultDocuments(vaultPath, payload) {
  const kind = KIND_FOLDERS[payload.sourceKind] ? payload.sourceKind : 'file';
  const folder = KIND_FOLDERS[kind];
  const destDir = path.join(vaultPath, folder);
  fs.mkdirSync(destDir, { recursive: true });

  const files = Array.isArray(payload.files) && payload.files.length
    ? payload.files
    : [{ filename: `${slugify(payload.title || 'nota')}.md`, content: payload.content || '' }];

  const written = [];
  files.forEach((file) => {
    const originalName = String(file.filename || 'nota.md');
    const title = payload.title || extractTitleFromMarkdown(file.content, path.basename(originalName, '.md'));
    const body = wrapClinicalBody({
      title,
      body: file.content || payload.content || '',
      author: payload.author,
      date: payload.date,
      originUrl: payload.originUrl,
      kind
    });
    const description = payload.description
      || `Importado desde ${kind}${payload.originUrl ? `: ${payload.originUrl}` : ''}`;
    const markdown = `${buildFrontmatter({
      title,
      description,
      kind,
      author: payload.author,
      date: payload.date,
      originUrl: payload.originUrl,
      filename: originalName
    })}${body.endsWith('\n') ? body : `${body}\n`}`;

    const dest = uniquePath(destDir, `${slugify(title)}.md`);
    fs.writeFileSync(dest, markdown, 'utf8');
    written.push(path.relative(vaultPath, dest).replace(/\\/g, '/'));
  });

  invalidateVaultCache(vaultPath);
  return { kind, folder, files: written };
}
