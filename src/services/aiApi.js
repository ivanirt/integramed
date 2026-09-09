const API_BASE = '/api';

export async function consultClinicalAi({
  diagnosis,
  diagnosisFreeText,
  modalities,
  question,
  apiKey,
  baseUrl,
  model
}) {
  const response = await fetch(`${API_BASE}/ai/consult`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ai-key': apiKey || '',
      'x-ai-base-url': baseUrl || 'https://openrouter.ai/api/v1',
      'x-ai-model': model || 'openai/gpt-4o'
    },
    body: JSON.stringify({
      diagnosis,
      diagnosisFreeText: diagnosisFreeText || '',
      modalities,
      question: question || ''
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || data?.message
      || (response.status === 404
        ? 'El proxy no tiene la ruta de IA. Reinicia npm run dev (el puerto 3001 quedó con el servidor anterior).'
        : `AI request failed (${response.status})`);
    throw new Error(message);
  }
  return data;
}

export async function getClinicalVaultStatus() {
  const response = await fetch(`${API_BASE}/ai/vault-status`);
  if (!response.ok) return { exists: false, noteCount: 0, path: '' };
  return response.json();
}
