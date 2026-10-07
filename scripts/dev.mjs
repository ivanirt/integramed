import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const REJECTED = new Set(['integramed-dev-session-secret']);

function acceptable(value) {
  return typeof value === 'string' && value.trim().length >= 32 && !REJECTED.has(value.trim());
}

// DEV-ONLY fallback. Production never reaches this script.
// One random secret per `npm run dev` invocation, inherited by the Next and
// proxy processes. It is not a known constant, not printed, and not written to disk.
function ensure(name) {
  if (acceptable(process.env[name])) {
    process.env[name] = process.env[name].trim();
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      `${name} must be set to a unique value of at least 32 characters. Generate one with: openssl rand -base64 48`
    );
    process.exit(1);
  }
  process.env[name] = randomBytes(48).toString('base64url');
  console.warn(
    `[dev] ${name} is missing, shorter than 32 characters, or the example value. Using a random secret for this dev process only.`
  );
}

ensure('SESSION_SECRET');
ensure('FHIR_PROXY_SECRET');

if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) {
  console.warn(
    '[IntegraMed] El correo de restablecimiento no está configurado (faltan SMTP_HOST o MAIL_FROM). La solicitud responde igual y no genera enlace, salvo PASSWORD_RESET_LOG_LINK=1 en desarrollo. Para asignar una contraseña en el servidor: npm run set-password -- <correo>. La contraseña se escribe en el prompt oculto o por stdin.'
  );
}

const concurrently = path.join(root, 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js');
const child = spawn(
  process.execPath,
  [
    concurrently,
    '--kill-others',
    '--success',
    'first',
    '-n',
    'fhir,web',
    '-c',
    'cyan,magenta',
    'npm run dev:fhir',
    'npm run dev:web'
  ],
  { stdio: 'inherit', env: process.env, cwd: root }
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
