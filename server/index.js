import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import tls from 'node:tls';
import { fileURLToPath } from 'url';

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

console.log(`[FHIR Proxy] Initialized with Base URL: ${FHIR_BASE_URL ? FHIR_BASE_URL : '(NOT SET)'}`);

// Health check and status endpoint
app.get('/api/health', async (req, res) => {
  const isConfigured = Boolean(FHIR_BASE_URL && FHIR_AUTH_TOKEN);
  let liveStatus = 'disconnected';
  let message = '';
  let patientCount = null;

  if (isConfigured) {
    try {
      const testRes = await fetch(`${FHIR_BASE_URL.replace(/\/$/, '')}/Patient?_summary=count`, {
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

app.listen(PORT, () => {
  console.log(`🚀 IntegraMed FHIR Proxy Server running on http://localhost:${PORT}`);
});
