import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Upload,
  Download,
  Link2,
  ShieldAlert,
  ListChecks,
  X,
  ExternalLink,
  Sparkles,
  FileText,
  Video,
  Landmark
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getVaultNotes,
  getVaultNote,
  getVaultSources,
  setVaultSourceEnabled,
  getVaultGraph,
  applyVaultRelink,
  getVaultCongruence,
  getVaultRules,
  importVaultDocuments,
  exportVaultZip
} from '../services/vaultApi';

const TABS = ['catalog', 'rules', 'links', 'congruence'];
const IMPORT_KINDS = ['congress', 'youtube', 'notebooklm', 'file'];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function FactCard({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '0.75rem',
        padding: '0.9rem 1rem',
        minHeight: '96px'
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.5, fontWeight: 500 }}>
        {value || '—'}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        width: '44px',
        height: '26px',
        borderRadius: '9999px',
        border: 'none',
        backgroundColor: checked ? '#0f766e' : '#cbd5e1',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(15,23,42,0.2)',
          transition: 'left 0.15s ease'
        }}
      />
    </button>
  );
}

export default function VaultPage({ addToast }) {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState('catalog');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [detail, setDetail] = useState(null);
  const [graph, setGraph] = useState({ broken: [], suggestions: [], outbound: {}, inbound: {} });
  const [issues, setIssues] = useState([]);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    sourceKind: 'notebooklm',
    title: '',
    author: '',
    date: '',
    originUrl: '',
    content: ''
  });
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, sourcesRes] = await Promise.all([
        getVaultNotes(language, query),
        getVaultSources(language)
      ]);
      setNotes(notesRes.notes || []);
      setSources(sourcesRes.sources || []);
    } catch (err) {
      if (addToast) addToast('error', err.message, t('vaultTitle'));
    } finally {
      setLoading(false);
    }
  }, [language, query, addToast, t]);

  useEffect(() => {
    const timer = setTimeout(loadCatalog, query ? 280 : 0);
    return () => clearTimeout(timer);
  }, [loadCatalog, query]);

  useEffect(() => {
    if (tab === 'links') {
      getVaultGraph(language).then(setGraph).catch((err) => addToast?.('error', err.message));
    }
    if (tab === 'congruence') {
      getVaultCongruence(language).then((res) => setIssues(res.issues || [])).catch((err) => addToast?.('error', err.message));
    }
    if (tab === 'rules') {
      getVaultRules(language).then(setRules).catch((err) => addToast?.('error', err.message));
    }
  }, [tab, language, addToast]);

  useEffect(() => {
    if (!selectedFile) {
      setDetail(null);
      return;
    }
    getVaultNote(language, selectedFile)
      .then(setDetail)
      .catch((err) => addToast?.('error', err.message));
  }, [selectedFile, language, addToast]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.file === selectedFile) || detail,
    [notes, selectedFile, detail]
  );

  const handleToggleSource = async (source) => {
    try {
      await setVaultSourceEnabled(language, source.id, !source.enabled);
      await loadCatalog();
      if (addToast) addToast('success', t('vaultSourceToggled'), source.title);
    } catch (err) {
      if (addToast) addToast('error', err.message);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const files = selectedFile ? [selectedFile] : notes.map((note) => note.file);
      await exportVaultZip(language, files);
      if (addToast) addToast('success', t('vaultExportDone'), t('vaultTitle'));
    } catch (err) {
      if (addToast) addToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await importVaultDocuments({
        ...importForm,
        language
      });
      setImportOpen(false);
      setImportForm({ sourceKind: 'notebooklm', title: '', author: '', date: '', originUrl: '', content: '' });
      await loadCatalog();
      if (result.files?.[0]) setSelectedFile(result.files[0]);
      if (addToast) addToast('success', t('vaultImportDone'), result.files?.join(', '));
    } catch (err) {
      if (addToast) addToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRelink = async () => {
    setBusy(true);
    try {
      const result = await applyVaultRelink(language, graph.suggestions || []);
      const next = await getVaultGraph(language);
      setGraph(next);
      if (addToast) addToast('success', t('vaultRelinkDone').replace('{count}', String(result.written?.length || 0)));
    } catch (err) {
      if (addToast) addToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const card = selectedNote?.clinicalCard || {};

  return (
    <div style={{ padding: '1.5rem 1.75rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <BookOpen size={22} color="#0f766e" />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t('vaultTitle')}
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', maxWidth: '720px', lineHeight: 1.5 }}>
            {t('vaultSubtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> {t('vaultImport')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExport} disabled={busy} style={{ backgroundColor: '#0f766e' }}>
            <Download size={16} /> {t('vaultExport')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="btn btn-sm"
            style={{
              backgroundColor: tab === id ? '#5eead4' : '#ffffff',
              color: tab === id ? '#047857' : '#475569',
              border: '1px solid #e2e8f0',
              fontWeight: tab === id ? 700 : 500
            }}
          >
            {t(`vaultTab_${id}`)}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) 1fr', gap: '1rem', alignItems: 'start' }} className="vault-catalog">
          <aside style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
              {t('vaultSourcesPanel')}
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {sources.length === 0 && (
                <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.8125rem' }}>{t('vaultNoSources')}</div>
              )}
              {sources.map((source) => (
                <div key={source.id} style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{source.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {source.author || '—'} · {formatDate(source.date)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      {(source.topics || []).join(', ') || t('vaultTopicGeneric')} · {source.noteCount}
                    </div>
                  </div>
                  <Switch checked={source.enabled} onChange={() => handleToggleSource(source)} label={source.title} />
                </div>
              ))}
            </div>
          </aside>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.9rem', top: '0.85rem' }} />
              <input
                className="form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('vaultSearchPlaceholder')}
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            {selectedNote && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <FactCard label={t('vaultFactWhat')} value={card.what} />
                  <FactCard label={t('vaultFactWhy')} value={card.why} />
                  <FactCard label={t('vaultFactHow')} value={card.how} />
                  <FactCard label={t('vaultFactWhen')} value={card.when} />
                </div>
                <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '0.75rem', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#0f766e' }}>{t('vaultFactSource')}</div>
                    <div style={{ fontSize: '0.875rem', color: '#134e4a', fontWeight: 600, marginTop: '0.2rem' }}>{card.source || selectedNote.sources?.[0]?.title || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedNote.author || card.author} · {formatDate(selectedNote.date || card.date)}</div>
                  </div>
                  {(card.sourceUrl || selectedNote.sources?.[0]?.url) && (
                    <a
                      href={card.sourceUrl || selectedNote.sources[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline-primary"
                    >
                      <ExternalLink size={14} /> {t('vaultLearnMore')}
                    </a>
                  )}
                </div>
              </div>
            )}

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '1.5rem', color: '#64748b' }}>{t('vaultLoading')}</div>
              ) : notes.length === 0 ? (
                <div style={{ padding: '1.5rem', color: '#64748b' }}>{t('vaultEmpty')}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="patient-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>{t('vaultColTopic')}</th>
                        <th>{t('vaultColAuthor')}</th>
                        <th>{t('vaultColSource')}</th>
                        <th>{t('vaultColDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notes.map((note) => {
                        const active = note.file === selectedFile;
                        return (
                          <tr
                            key={note.file}
                            onClick={() => setSelectedFile(note.file)}
                            style={{ cursor: 'pointer', backgroundColor: active ? '#f0fdfa' : undefined }}
                          >
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{note.title}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{note.topic || note.type} · {note.file}</div>
                            </td>
                            <td>{note.author || '—'}</td>
                            <td>{note.sources?.[0]?.title || '—'}</td>
                            <td>{formatDate(note.date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {detail?.outbound?.length > 0 && (
              <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>{t('vaultLinksOut')}: </strong>
                {detail.outbound.map((link) => link.title).join(' · ')}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'rules' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1.25rem 1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ListChecks size={18} color="#0f766e" />
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{t('vaultRulesTitle')}</h2>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', lineHeight: 1.55, color: '#334155', margin: 0 }}>
            {rules?.markdown || t('vaultLoading')}
          </pre>
        </div>
      )}

      {tab === 'links' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>{t('vaultLinksHelp')}</p>
            <button type="button" className="btn btn-primary" style={{ backgroundColor: '#0f766e' }} onClick={handleRelink} disabled={busy || !(graph.suggestions || []).length}>
              <Link2 size={16} /> {t('vaultApplyLinks')} ({(graph.suggestions || []).length})
            </button>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden' }}>
            {(graph.suggestions || []).slice(0, 40).map((item) => (
              <div key={`${item.file}-${item.target}`} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                <strong>{item.title}</strong> → [[{item.target}|{item.phrase}]]
              </div>
            ))}
            {!(graph.suggestions || []).length && <div style={{ padding: '1.25rem', color: '#64748b' }}>{t('vaultNoSuggestions')}</div>}
          </div>
          {(graph.broken || []).length > 0 && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.875rem', padding: '1rem' }}>
              <div style={{ fontWeight: 800, marginBottom: '0.5rem' }}>{t('vaultBrokenLinks')}</div>
              {graph.broken.slice(0, 20).map((item) => (
                <div key={`${item.from}-${item.target}`} style={{ fontSize: '0.8125rem', color: '#92400e' }}>
                  {item.from} → {item.target}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'congruence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {issues.length === 0 && (
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.875rem', padding: '1.1rem', color: '#065f46' }}>
              {t('vaultCongruenceOk')}
            </div>
          )}
          {issues.map((issue, idx) => (
            <div key={`${issue.code}-${idx}`} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '1rem 1.15rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                <ShieldAlert size={16} color={issue.severity === 'conflict' ? '#dc2626' : '#d97706'} />
                <strong>{issue.title}</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>{issue.severity}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>{issue.detail}</div>
              {issue.files && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                  {issue.files.map((file) => file.file).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {importOpen && (
        <div className="modal-overlay" onClick={() => setImportOpen(false)}>
          <form className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()} onSubmit={handleImport}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800 }}>{t('vaultImportTitle')}</h3>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setImportOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {IMPORT_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setImportForm((prev) => ({ ...prev, sourceKind: kind }))}
                    style={{
                      backgroundColor: importForm.sourceKind === kind ? '#5eead4' : '#fff',
                      color: importForm.sourceKind === kind ? '#047857' : '#475569',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {kind === 'youtube' && <Video size={14} />}
                    {kind === 'congress' && <Landmark size={14} />}
                    {kind === 'notebooklm' && <Sparkles size={14} />}
                    {kind === 'file' && <FileText size={14} />}
                    {t(`vaultKind_${kind}`)}
                  </button>
                ))}
              </div>
              {importForm.sourceKind === 'notebooklm' && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.65rem', padding: '0.75rem 0.9rem', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
                  {t('vaultNotebookLmHint')}
                </div>
              )}
              <label className="form-label">{t('vaultColTopic')}
                <input className="form-input" required value={importForm.title} onChange={(e) => setImportForm((p) => ({ ...p, title: e.target.value }))} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="form-label">{t('vaultColAuthor')}
                  <input className="form-input" value={importForm.author} onChange={(e) => setImportForm((p) => ({ ...p, author: e.target.value }))} />
                </label>
                <label className="form-label">{t('vaultColDate')}
                  <input className="form-input" type="date" value={importForm.date} onChange={(e) => setImportForm((p) => ({ ...p, date: e.target.value }))} />
                </label>
              </div>
              <label className="form-label">{t('vaultOriginUrl')}
                <input className="form-input" type="url" placeholder="https://" value={importForm.originUrl} onChange={(e) => setImportForm((p) => ({ ...p, originUrl: e.target.value }))} />
              </label>
              <label className="form-label">{t('vaultImportBody')}
                <input
                  type="file"
                  accept=".md,.txt,.markdown"
                  style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.8125rem' }}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const content = await file.text();
                    setImportForm((prev) => ({
                      ...prev,
                      content,
                      title: prev.title || file.name.replace(/\.md$/i, '')
                    }));
                  }}
                />
                <textarea className="form-textarea" rows={8} required value={importForm.content} onChange={(e) => setImportForm((p) => ({ ...p, content: e.target.value }))} />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setImportOpen(false)}>{t('btnClose')}</button>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ backgroundColor: '#0f766e' }}>{t('vaultImport')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
