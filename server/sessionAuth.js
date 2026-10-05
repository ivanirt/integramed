import { createHmac, timingSafeEqual } from 'crypto';
import fs from 'fs';
import { isSessionPasswordCurrent } from '../src/lib/session-stamp.js';
import { accountsFile } from '../src/lib/auth-root.js';
import { isPractitionerMutation } from '../src/lib/fhir-path.js';

export const SESSION_COOKIE = 'integramed_session';
export const MIN_SECRET_LENGTH = 32;
export const REJECTED_SECRETS = new Set(['integramed-dev-session-secret']);
export const KNOWN_ROLES = new Set([
  'doctor',
  'therapist',
  'nurse',
  'receptionist',
  'admin',
  'lab',
  'pharmacist'
]);

export function normalizeSecret(value) {
  return String(value || '').trim();
}

export function isAcceptableSecret(value) {
  const secret = normalizeSecret(value);
  return secret.length >= MIN_SECRET_LENGTH && !REJECTED_SECRETS.has(secret);
}

export function signPayload(payload, secret) {
  return createHmac('sha256', normalizeSecret(secret)).update(payload).digest('base64url');
}

export function signSession(user, secret, exp = user?.exp ?? Date.now() + 1000 * 60 * 60) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
  return `${payload}.${signPayload(payload, secret)}`;
}

export function verifySessionToken(token, secret) {
  const key = normalizeSecret(secret);
  if (!isAcceptableSecret(key) || !token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = signPayload(payload, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (!data.id || !KNOWN_ROLES.has(data.role)) return null;
    return {
      id: String(data.id),
      name: String(data.name || ''),
      login: String(data.login || ''),
      role: data.role,
      exp: data.exp,
      pwdAt: typeof data.pwdAt === 'number' && Number.isFinite(data.pwdAt) ? data.pwdAt : 0
    };
  } catch {
    return null;
  }
}

export function sessionFromRequest(req, secret = process.env.SESSION_SECRET) {
  const header = String(req.headers?.cookie || '');
  const parts = header.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (name !== SESSION_COOKIE) continue;
    const raw = rest.join('=');
    try {
      return verifySessionToken(decodeURIComponent(raw), secret);
    } catch {
      return null;
    }
  }
  return null;
}

export function proxySecretOk(req, expected = process.env.FHIR_PROXY_SECRET) {
  const key = normalizeSecret(expected);
  if (!isAcceptableSecret(key)) return false;
  const provided = normalizeSecret(
    req.get?.('x-integramed-proxy-secret') || req.headers?.['x-integramed-proxy-secret']
  );
  const a = Buffer.from(provided);
  const b = Buffer.from(key);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isVaultWrite(req) {
  const pathOnly = String(req.path || '');
  if (!pathOnly.startsWith('/api/vault')) return false;
  const method = String(req.method || 'GET').toUpperCase();
  return method !== 'GET' && method !== 'HEAD';
}

export function readPasswordStamps(root) {
  try {
    const raw = fs.readFileSync(accountsFile(root), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.accounts) ? parsed.accounts : [];
  } catch {
    return [];
  }
}

export { isPractitionerMutation };

export function requireClinicAccess(req, res, next) {
  if (!proxySecretOk(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const user = sessionFromRequest(req);
  if (!user || !isSessionPasswordCurrent(user, readPasswordStamps())) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  if (isVaultWrite(req) && user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administración puede modificar la bóveda.' });
  }
  if (isPractitionerMutation(req) && user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administración puede modificar un Practitioner.' });
  }
  req.clinicUser = user;
  return next();
}
