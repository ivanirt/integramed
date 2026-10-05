const DEFAULT_HOSTS = ['openrouter.ai'];

export function allowedAiHosts() {
  const raw = process.env.CLINICAL_AI_HOST_ALLOWLIST;
  const list = raw === undefined || String(raw).trim() === '' ? DEFAULT_HOSTS : String(raw).split(',');
  return list.map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function resolveAiBaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    const error = new Error('CLINICAL_AI_BASE no está configurada');
    error.status = 500;
    throw error;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    const error = new Error('CLINICAL_AI_BASE no es una URL válida');
    error.status = 500;
    throw error;
  }
  if (url.protocol !== 'https:') {
    const error = new Error('CLINICAL_AI_BASE debe usar https');
    error.status = 500;
    throw error;
  }
  if (url.username || url.password) {
    const error = new Error('CLINICAL_AI_BASE no puede incluir credenciales');
    error.status = 500;
    throw error;
  }
  const host = url.hostname.toLowerCase();
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  if (host === 'localhost' || host.endsWith('.localhost') || ip) {
    const error = new Error('El host de IA no está permitido');
    error.status = 500;
    throw error;
  }
  if (!allowedAiHosts().includes(host)) {
    const error = new Error('El host de IA no está permitido');
    error.status = 500;
    throw error;
  }
  return url.toString().replace(/\/$/, '');
}
