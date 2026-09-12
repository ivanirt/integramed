const API_BASE = '/api';

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Vault request failed (${response.status})`);
  }
  return data;
}

export async function getVaultNotes(language, query = '') {
  const params = new URLSearchParams({ language });
  if (query) params.set('q', query);
  const response = await fetch(`${API_BASE}/vault/notes?${params}`);
  return parseJson(response);
}

export async function getVaultNote(language, file) {
  const params = new URLSearchParams({ language, file });
  const response = await fetch(`${API_BASE}/vault/note?${params}`);
  return parseJson(response);
}

export async function getVaultSources(language) {
  const response = await fetch(`${API_BASE}/vault/sources?language=${encodeURIComponent(language)}`);
  return parseJson(response);
}

export async function setVaultSourceEnabled(language, sourceId, enabled) {
  const response = await fetch(`${API_BASE}/vault/sources/${encodeURIComponent(sourceId)}?language=${encodeURIComponent(language)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled, language })
  });
  return parseJson(response);
}

export async function searchVault(language, query) {
  const params = new URLSearchParams({ language, q: query });
  const response = await fetch(`${API_BASE}/vault/search?${params}`);
  return parseJson(response);
}

export async function getVaultGraph(language) {
  const response = await fetch(`${API_BASE}/vault/graph?language=${encodeURIComponent(language)}`);
  return parseJson(response);
}

export async function applyVaultRelink(language, suggestions) {
  const response = await fetch(`${API_BASE}/vault/relink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, suggestions })
  });
  return parseJson(response);
}

export async function getVaultCongruence(language) {
  const response = await fetch(`${API_BASE}/vault/congruence?language=${encodeURIComponent(language)}`);
  return parseJson(response);
}

export async function getVaultRules(language) {
  const response = await fetch(`${API_BASE}/vault/rules?language=${encodeURIComponent(language)}`);
  return parseJson(response);
}

export async function importVaultDocuments(payload) {
  const response = await fetch(`${API_BASE}/vault/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseJson(response);
}

export async function exportVaultZip(language, files) {
  const response = await fetch(`${API_BASE}/vault/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, files })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `integramed-vault-${language}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
