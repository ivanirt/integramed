import fs from 'fs';
import path from 'path';

function reject() {
  throw new Error('Ruta de nota no válida');
}

export function resolveInsideVault(vaultPath, relative) {
  if (!vaultPath) reject();
  let raw = String(relative ?? '');
  if (raw.includes('\0')) reject();
  raw = raw.replace(/\\/g, '/').trim();
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    reject();
  }
  if (decoded.includes('\0') || decoded.includes('\\')) reject();
  const normalized = decoded.replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) reject();
  const segments = normalized.split('/');
  if (!segments.length || segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    reject();
  }

  let root;
  try {
    root = fs.realpathSync(vaultPath);
  } catch {
    reject();
  }

  const abs = path.resolve(root, ...segments);
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) reject();

  if (fs.existsSync(abs)) {
    let real;
    try {
      real = fs.realpathSync(abs);
    } catch {
      reject();
    }
    const relReal = path.relative(root, real);
    if (!relReal || relReal.startsWith('..') || path.isAbsolute(relReal)) reject();
    return { abs: real, relative: segments.join('/') };
  }

  const parent = path.dirname(abs);
  if (fs.existsSync(parent)) {
    let realParent;
    try {
      realParent = fs.realpathSync(parent);
    } catch {
      reject();
    }
    const relParent = path.relative(root, realParent);
    if (relParent.startsWith('..') || path.isAbsolute(relParent)) reject();
  }
  return { abs, relative: segments.join('/') };
}
