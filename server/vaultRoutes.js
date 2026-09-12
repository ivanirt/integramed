import fs from 'fs';
import path from 'path';
import {
  loadVaultNotes,
  resolveVaultPath,
  normalizeVaultLanguage,
  invalidateVaultCache
} from './clinicalVault.js';
import {
  collectSources,
  serializeNote,
  buildLinkGraph,
  suggestAutoLinks,
  applyAutoLinks,
  reviewCongruence,
  searchVault,
  readNoteFile,
  listExportFiles
} from './vaultCatalog.js';
import {
  loadVaultSourceSettings,
  setSourceEnabled,
  noteIsEnabled
} from './vaultSettings.js';
import { importVaultDocuments } from './vaultImport.js';
import { buildZipArchive, randomZipName } from './vaultZip.js';
import { vaultRulesMarkdown, VAULT_CONTEXT_RULES } from './vaultRules.js';

function languageFrom(req) {
  return normalizeVaultLanguage(req.query?.language || req.body?.language || req.headers['x-ui-language']);
}

function loadEnabledNotes(projectRoot, language) {
  const vaultPath = resolveVaultPath(language, projectRoot);
  const notes = loadVaultNotes(vaultPath);
  const settings = loadVaultSourceSettings(projectRoot);
  const disabled = settings[language]?.disabled || [];
  return {
    vaultPath,
    notes,
    disabled,
    enabledNotes: notes.filter((note) => noteIsEnabled(note, disabled)),
    settings
  };
}

export function registerVaultRoutes(app, { PROJECT_ROOT }) {
  app.get('/api/vault/notes', (req, res) => {
    try {
      const language = languageFrom(req);
      const { enabledNotes, vaultPath, disabled } = loadEnabledNotes(PROJECT_ROOT, language);
      const query = String(req.query.q || '').trim();
      const notes = query ? searchVault(enabledNotes, query, disabled) : enabledNotes.map(serializeNote);
      res.json({
        language,
        path: vaultPath,
        count: notes.length,
        notes
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vault/note', (req, res) => {
    try {
      const language = languageFrom(req);
      const vaultPath = resolveVaultPath(language, PROJECT_ROOT);
      const relative = decodeURIComponent(String(req.query.file || ''));
      const file = readNoteFile(vaultPath, relative);
      if (!file) return res.status(404).json({ error: 'Nota no encontrada' });
      const notes = loadVaultNotes(vaultPath);
      const note = notes.find((item) => item.file === file.file);
      const graph = buildLinkGraph(notes);
      res.json({
        ...serializeNote(note || { file: file.file, title: file.file, sources: [], wikilinks: [], clinicalCard: {} }),
        content: file.content,
        outbound: graph.outbound[file.file] || [],
        inbound: graph.inbound[file.file] || []
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/vault/sources', (req, res) => {
    try {
      const language = languageFrom(req);
      const { notes, disabled } = loadEnabledNotes(PROJECT_ROOT, language);
      const sources = collectSources(notes).map((source) => ({
        ...source,
        enabled: !disabled.includes(source.id)
      }));
      res.json({ language, sources, disabled });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/vault/sources/:id', (req, res) => {
    try {
      const language = languageFrom(req);
      const enabled = req.body?.enabled !== false;
      const settings = setSourceEnabled(PROJECT_ROOT, language, decodeURIComponent(req.params.id), enabled);
      invalidateVaultCache();
      res.json({ ok: true, language, disabled: settings[language].disabled, enabled });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vault/search', (req, res) => {
    try {
      const language = languageFrom(req);
      const query = String(req.query.q || '').trim();
      if (!query) return res.json({ language, results: [] });
      const { enabledNotes, disabled } = loadEnabledNotes(PROJECT_ROOT, language);
      res.json({
        language,
        query,
        results: searchVault(enabledNotes, query, disabled)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vault/graph', (req, res) => {
    try {
      const language = languageFrom(req);
      const { enabledNotes } = loadEnabledNotes(PROJECT_ROOT, language);
      const graph = buildLinkGraph(enabledNotes);
      res.json({
        language,
        ...graph,
        suggestions: suggestAutoLinks(enabledNotes)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/vault/relink', (req, res) => {
    try {
      const language = languageFrom(req);
      const { vaultPath, enabledNotes } = loadEnabledNotes(PROJECT_ROOT, language);
      const suggestions = Array.isArray(req.body?.suggestions)
        ? req.body.suggestions
        : suggestAutoLinks(enabledNotes);
      const result = applyAutoLinks(vaultPath, enabledNotes, suggestions);
      res.json({ ok: true, ...result, remaining: suggestAutoLinks(loadVaultNotes(vaultPath)) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vault/congruence', (req, res) => {
    try {
      const language = languageFrom(req);
      const { enabledNotes } = loadEnabledNotes(PROJECT_ROOT, language);
      res.json({ language, issues: reviewCongruence(enabledNotes) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vault/rules', (req, res) => {
    const language = languageFrom(req);
    const docsPath = path.join(PROJECT_ROOT, 'docs', 'vault-context-files.md');
    const fromDisk = fs.existsSync(docsPath) ? fs.readFileSync(docsPath, 'utf8') : vaultRulesMarkdown(language);
    res.json({
      language,
      rules: VAULT_CONTEXT_RULES,
      markdown: language === 'en' ? vaultRulesMarkdown('en') : fromDisk
    });
  });

  app.post('/api/vault/import', (req, res) => {
    try {
      const language = languageFrom(req);
      const vaultPath = resolveVaultPath(language, PROJECT_ROOT);
      const result = importVaultDocuments(vaultPath, {
        sourceKind: req.body?.sourceKind,
        title: req.body?.title,
        author: req.body?.author,
        date: req.body?.date,
        originUrl: req.body?.originUrl,
        description: req.body?.description,
        content: req.body?.content,
        files: req.body?.files
      });
      res.json({ ok: true, language, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/vault/export', (req, res) => {
    try {
      const language = languageFrom(req);
      const vaultPath = resolveVaultPath(language, PROJECT_ROOT);
      const notes = loadVaultNotes(vaultPath);
      const selected = listExportFiles(notes, req.body?.files || req.query.files?.split(',').filter(Boolean));
      const zipFiles = selected.map((note) => {
        const file = readNoteFile(vaultPath, note.file);
        return { name: note.file, content: file?.content || note.body || '' };
      });
      const archive = buildZipArchive(zipFiles);
      const filename = randomZipName(`integramed-vault-${language}`);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(archive);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

export function filterNotesForConsult(notes, disabledIds) {
  return notes.filter((note) => noteIsEnabled(note, disabledIds));
}
