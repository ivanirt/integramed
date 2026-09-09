import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import tls from 'node:tls';
import { fileURLToPath } from 'url';
import { loadVaultNotes, rankVaultNotes, excerptForPrompt } from './clinicalVault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function applySystemCaStore() {
  try {
    if (typeof tls.setDefaultCACertificates === 'function' && typeof tls.getCACertificates === 'function') {
      tls.setDefaultCACertificates([
        ...tls.getCACertificates('default'),
        ...tls.getCACertificates('system')
      ]);
      console.log('[FHIR Proxy] TLS: using Node default CAs plus the OS certificate store');
    }
  } catch (err) {
    console.warn('[FHIR Proxy] Could not load OS certificate store:', err.message);
  }
}

applySystemCaStore();

async function fetchFhirWithRetry(url, options, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      const code = err?.cause?.code || err?.code || '';
      const retryable = String(code).includes('TIMEOUT') || String(err?.message || '').includes('fetch failed');
      if (!retryable || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
    }
  }
  throw lastError;
}

function describeFetchError(err) {
  const cause = err?.cause;
  const parts = [err?.message, cause?.code, cause?.message].filter(Boolean);
  return [...new Set(parts)].join(' — ');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({
  type: ['application/json', 'application/fhir+json', 'application/*+json'],
  limit: '10mb'
}));

// Config
let FHIR_BASE_URL = process.env.FHIR_BASE_URL || '';
let FHIR_AUTH_TOKEN = process.env.FHIR_AUTH_TOKEN || '';

const CLINICAL_VAULT_PATH = path.resolve(
  process.env.CLINICAL_VAULT_PATH
    ? process.env.CLINICAL_VAULT_PATH
    : path.join(__dirname, '../vault')
);

console.log(`[FHIR Proxy] Initialized with Base URL: ${FHIR_BASE_URL ? FHIR_BASE_URL : '(NOT SET)'}`);
console.log(`[Clinical AI] Vault path: ${CLINICAL_VAULT_PATH}`);

// Health check and status endpoint
app.get('/api/health', async (req, res) => {
  const isConfigured = Boolean(FHIR_BASE_URL && FHIR_AUTH_TOKEN);
  let liveStatus = 'disconnected';
  let message = '';
  let patientCount = null;

  if (isConfigured) {
    try {
      const testRes = await fetchFhirWithRetry(`${FHIR_BASE_URL.replace(/\/$/, '')}/Patient?_summary=count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FHIR_AUTH_TOKEN}`,
          'Accept': 'application/fhir+json, application/json'
        }
      });

      if (testRes.ok) {
        const data = await testRes.json();
        liveStatus = 'connected';
        patientCount = data.total ?? (data.entry ? data.entry.length : 0);
        message = 'FHIR R4 Server Connected';
      } else {
        liveStatus = 'auth_error';
        message = `Server returned status ${testRes.status}: ${testRes.statusText}`;
      }
    } catch (err) {
      liveStatus = 'unreachable';
      message = describeFetchError(err) || 'Failed to reach FHIR Server';
      console.error('[FHIR Proxy] Health check failed:', message);
    }
  } else {
    message = 'FHIR Base URL or Bearer Token missing in environment';
  }

  res.json({
    status: liveStatus,
    message,
    patientCount,
    serverUrl: FHIR_BASE_URL ? FHIR_BASE_URL.replace(/\/$/, '') : null,
    hasToken: Boolean(FHIR_AUTH_TOKEN)
  });
});

// Update config dynamically if requested
app.post('/api/config', (req, res) => {
  const { fhirBaseUrl, fhirAuthToken } = req.body;
  if (fhirBaseUrl) FHIR_BASE_URL = fhirBaseUrl.trim();
  if (fhirAuthToken) FHIR_AUTH_TOKEN = fhirAuthToken.trim();

  res.json({
    success: true,
    message: 'Configuration updated',
    serverUrl: FHIR_BASE_URL,
    hasToken: Boolean(FHIR_AUTH_TOKEN)
  });
});

app.get('/api/ai/vault-status', (req, res) => {
  try {
    const notes = loadVaultNotes(CLINICAL_VAULT_PATH);
    res.json({
      exists: notes.length > 0,
      noteCount: notes.length,
      path: CLINICAL_VAULT_PATH
    });
  } catch (err) {
    res.status(500).json({ exists: false, noteCount: 0, error: err.message, path: CLINICAL_VAULT_PATH });
  }
});

app.post('/api/ai/consult', async (req, res) => {
  const apiKey = String(req.headers['x-ai-key'] || '').trim();
  const baseUrl = String(req.headers['x-ai-base-url'] || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const model = String(req.headers['x-ai-model'] || 'openai/gpt-4o').trim();

  if (!apiKey) {
    return res.status(400).json({ error: 'Falta la API key del modelo. Configúrala en Mi perfil.' });
  }

  const diagnosis = req.body?.diagnosis;
  const codedDiagnosis = Array.isArray(diagnosis)
    ? diagnosis.map((item) => (typeof item === 'string' ? item : `${item.code || ''} ${item.label || ''}`)).join(' ')
    : String(diagnosis || '');
  const freeTextDiagnosis = String(req.body?.diagnosisFreeText || '').trim();
  const diagnosisText = [codedDiagnosis, freeTextDiagnosis].filter((part) => String(part).trim()).join('\n');
  const question = String(req.body?.question || '').trim();
  const modalities = req.body?.modalities || [];

  if (!diagnosisText.trim()) {
    return res.status(400).json({ error: 'Indica un diagnóstico (código o texto libre) antes de consultar la IA.' });
  }

  let notes = [];
  try {
    notes = loadVaultNotes(CLINICAL_VAULT_PATH);
  } catch (err) {
    return res.status(500).json({ error: `No se pudo leer el vault: ${err.message}` });
  }

  if (!notes.length) {
    return res.status(404).json({
      error: 'El vault está vacío. Copia notas .md a la carpeta vault/ (o CLINICAL_VAULT_PATH).'
    });
  }

  const ranked = rankVaultNotes(notes, diagnosisText, modalities, 5);
  const sources = ranked.map((note) => ({
    file: note.file,
    title: note.title,
    excerpt: excerptForPrompt(note, 900)
  }));

  const contextBlock = sources.length
    ? sources.map((src, idx) => `[${idx + 1}] ${src.file}\n${src.excerpt}`).join('\n\n')
    : '(No hay notas del vault con coincidencia para este diagnóstico y las modalidades activas.)';

  const systemPrompt = [
    'Eres un asistente clínico de apoyo para un médico. No eres un prescriptor.',
    'Usa SOLO el contexto del vault. Si no hay evidencia en el contexto, dilo claramente y no inventes tratamientos.',
    'Cita los archivos de origen por nombre. No es una orden médica; el médico debe verificar antes de indicar.',
    'Responde en el idioma del diagnóstico (español si el texto está en español).',
    'Estructura: (1) lo que dice el vault de la condición, (2) ayudas o enfoques que recomiendan las notas, (3) límites / no es tratamiento.'
  ].join(' ');

  const userPrompt = `Diagnóstico del médico (código CIE y/o texto libre; cualquiera basta): ${diagnosisText}\nModalidades activas: ${(modalities || []).map((mod) => (typeof mod === 'object' ? mod.id : mod)).filter(Boolean).join(', ') || 'todas'}\nPregunta del médico: ${question || '¿Qué dice el vault y qué ayudas recomienda para este diagnóstico?'}\n\nContexto del vault:\n${contextBlock}`;

  try {
    const llmHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    if (baseUrl.includes('openrouter.ai')) {
      llmHeaders['HTTP-Referer'] = 'https://integramed.local';
      llmHeaders['X-Title'] = 'IntegraMed';
    }

    const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: llmHeaders,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const llmData = await llmResponse.json().catch(() => ({}));
    if (!llmResponse.ok) {
      const detail = llmData?.error?.message || llmData?.error || llmResponse.statusText;
      return res.status(llmResponse.status === 401 ? 401 : 502).json({
        error: `El modelo no respondió: ${detail}`
      });
    }

    const answer = llmData?.choices?.[0]?.message?.content || '';
    res.json({
      answer,
      sources: sources.map(({ file, title, excerpt }) => ({ file, title, excerpt: excerpt.slice(0, 320) }))
    });
  } catch (err) {
    res.status(502).json({ error: `Fallo al llamar al modelo: ${describeFetchError(err)}` });
  }
});

// FHIR Proxy Endpoint
app.all('/api/fhir/*', async (req, res) => {
  if (!FHIR_BASE_URL || !FHIR_AUTH_TOKEN) {
    return res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'required',
        diagnostics: 'FHIR_BASE_URL and FHIR_AUTH_TOKEN must be configured on the proxy server.'
      }]
    });
  }

  // Extract the relative FHIR path after /api/fhir/
  const fhirPath = req.params[0] || '';
  const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const targetUrl = `${FHIR_BASE_URL.replace(/\/$/, '')}/${fhirPath}${queryString}`;

  console.log(`[FHIR Proxy] ${req.method} -> ${targetUrl}`);

  try {
    const headers = {
      'Authorization': `Bearer ${FHIR_AUTH_TOKEN}`,
      'Accept': 'application/fhir+json, application/json'
    };

    const fetchOptions = {
      method: req.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
      headers['Content-Type'] = 'application/fhir+json';
      fetchOptions.body = JSON.stringify(req.body);
    }

    const fhirResponse = await fetch(targetUrl, fetchOptions);
    const contentType = fhirResponse.headers.get('content-type') || '';
    
    let responseData;
    if (contentType.includes('json')) {
      responseData = await fhirResponse.json();
    } else {
      responseData = await fhirResponse.text();
    }

    res.status(fhirResponse.status);

    // Forward relevant FHIR headers if present
    const locationHeader = fhirResponse.headers.get('location');
    if (locationHeader) {
      res.setHeader('Location', locationHeader);
    }
    const etagHeader = fhirResponse.headers.get('etag');
    if (etagHeader) {
      res.setHeader('ETag', etagHeader);
    }

    if (typeof responseData === 'object') {
      res.json(responseData);
    } else {
      res.send(responseData);
    }
  } catch (error) {
    console.error(`[FHIR Proxy Error] ${req.method} ${targetUrl}:`, describeFetchError(error), error);
    res.status(502).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'fatal',
        code: 'transient',
        diagnostics: `Proxy communication failure: ${error.message}`
      }]
    });
  }
});

// Serve static assets in production if built
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 IntegraMed FHIR Proxy Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FHIR Proxy] Port ${PORT} is already in use. Stop the old Node process and run npm run dev again.`);
    process.exit(1);
  }
  throw err;
});
