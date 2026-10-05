import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { signSession } from "../server/sessionAuth.js";

const SESSION_SECRET = "s".repeat(48);
const FHIR_PROXY_SECRET = "p".repeat(48);

process.env.SESSION_SECRET = SESSION_SECRET;
process.env.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
process.env.FHIR_MODE = "local";
process.env.FHIR_PROXY_NO_LISTEN = "1";
process.env.CLINICAL_AI_KEY = "";
process.env.CLINICAL_AI_BASE = "https://openrouter.ai/api/v1";

const { app } = await import("../server/index.js");

function listen(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function stop(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function request(server, method, path, { token, secret, body, headers = {} } = {}) {
  const { port } = server.address();
  const reqHeaders = { ...headers };
  if (secret) reqHeaders["x-integramed-proxy-secret"] = secret;
  if (token) reqHeaders.cookie = `integramed_session=${token}`;
  if (body !== undefined) reqHeaders["content-type"] = "application/json";
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: reqHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const doctor = () =>
  signSession({ id: "prac-1", name: "Ivan", login: "ivan", role: "doctor" }, SESSION_SECRET);
const admin = () =>
  signSession({ id: "prac-1", name: "Ivan", login: "ivan", role: "admin" }, SESSION_SECRET);

test("PHI and config routes reject missing and forged sessions", async () => {
  const server = await listen(app);
  try {
    const open = await request(server, "GET", "/api/fhir/Patient");
    assert.equal(open.status, 401);

    const forged = await request(server, "GET", "/api/fhir/Patient", {
      token: "forged.payload",
      secret: FHIR_PROXY_SECRET,
    });
    assert.equal(forged.status, 401);

    const noSecret = await request(server, "GET", "/api/fhir/Patient", { token: doctor() });
    assert.equal(noSecret.status, 401);

    const fhir = await request(server, "GET", "/fhir/metadata", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
    });
    assert.equal(fhir.status, 200);

    const config = await request(server, "POST", "/api/config", {
      body: { fhirBaseUrl: "http://127.0.0.1:9", fhirAuthToken: "stolen", fhirMode: "proxy" },
    });
    assert.equal(config.status, 401);

    const configAdmin = await request(server, "POST", "/api/config", {
      token: admin(),
      secret: FHIR_PROXY_SECRET,
      body: { fhirBaseUrl: "http://169.254.169.254/", fhirAuthToken: "stolen", fhirMode: "proxy" },
    });
    assert.equal(configAdmin.status, 405);
  } finally {
    await stop(server);
  }
});

test("vault relink rejects traversal and non-admin writes", async () => {
  const server = await listen(app);
  try {
    const doctorWrite = await request(server, "POST", "/api/vault/relink", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      body: { language: "es", suggestions: [{ file: "../secret.md", phrase: "x", target: "y" }] },
    });
    assert.equal(doctorWrite.status, 403);

    const traversal = await request(server, "POST", "/api/vault/relink", {
      token: admin(),
      secret: FHIR_PROXY_SECRET,
      body: {
        language: "es",
        suggestions: [{ file: "../../etc/passwd", phrase: "x", target: "y" }],
      },
    });
    assert.equal(traversal.status, 400);
  } finally {
    await stop(server);
  }
});

test("non-admin sessions cannot write Practitioner resources", async () => {
  const server = await listen(app);
  try {
    const denied = await request(server, "PUT", "/api/fhir/Practitioner/prac-sec", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      body: {
        resourceType: "Practitioner",
        id: "prac-sec",
        telecom: [{ system: "email", value: "attacker@evil.test" }],
      },
    });
    assert.equal(denied.status, 403);

    const bundle = await request(server, "POST", "/fhir", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      body: {
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          {
            request: { method: "PUT", url: "Practitioner/prac-sec" },
            resource: { resourceType: "Practitioner", id: "prac-sec" },
          },
        ],
      },
    });
    assert.equal(bundle.status, 403);

    const missing = await request(server, "GET", "/api/fhir/Practitioner/prac-sec", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
    });
    assert.equal(missing.status, 404);

    const created = await request(server, "POST", "/api/fhir/Practitioner", {
      token: admin(),
      secret: FHIR_PROXY_SECRET,
      body: { resourceType: "Practitioner", id: "prac-sec", active: true },
    });
    assert.equal(created.status, 201);

    const removed = await request(server, "DELETE", "/api/fhir/Practitioner/prac-sec", {
      token: admin(),
      secret: FHIR_PROXY_SECRET,
    });
    assert.equal(removed.status, 204);

    const patient = await request(server, "POST", "/api/fhir/Patient", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      body: { resourceType: "Patient", id: "pat-sec", active: true },
    });
    assert.equal(patient.status, 201);
    const dropPatient = await request(server, "DELETE", "/api/fhir/Patient/pat-sec", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
    });
    assert.equal(dropPatient.status, 204);
  } finally {
    await stop(server);
  }
});

test("staff-lookup rejects pipes and control characters", async () => {
  const server = await listen(app);
  try {
    const headers = {
      token: undefined,
      secret: FHIR_PROXY_SECRET,
    };
    const pipe = await request(server, "POST", "/api/internal/staff-lookup", {
      ...headers,
      body: { q: "ivan|admin@clinic.test" },
    });
    assert.equal(pipe.status, 400);
    const control = await request(server, "POST", "/api/internal/staff-lookup", {
      ...headers,
      body: { q: "ivan\n@clinic.test" },
    });
    assert.equal(control.status, 400);
    const login = await request(server, "POST", "/api/internal/staff-lookup", {
      ...headers,
      body: { q: "ivan" },
    });
    assert.equal(login.status, 404);
  } finally {
    await stop(server);
  }
});

test("consult ignores caller key and base URL", async () => {
  let hits = 0;
  const attacker = await listen((req, res) => {
    hits += 1;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "pwned" } }] }));
  });
  const server = await listen(app);
  const { port } = attacker.address();
  const previousKey = process.env.CLINICAL_AI_KEY;
  const previousBase = process.env.CLINICAL_AI_BASE;
  process.env.CLINICAL_AI_KEY = "server-key";
  process.env.CLINICAL_AI_BASE = `https://127.0.0.1:${port}/v1`;
  try {
    const res = await request(server, "POST", "/api/ai/consult", {
      token: doctor(),
      secret: FHIR_PROXY_SECRET,
      headers: {
        "x-ai-key": "caller-key",
        "x-ai-base-url": `http://127.0.0.1:${port}/v1`,
      },
      body: { diagnosis: "cefalea", language: "es" },
    });
    assert.equal(res.status, 500);
    assert.equal(hits, 0);
    assert.match(res.text, /no está permitido/);
  } finally {
    process.env.CLINICAL_AI_KEY = previousKey;
    process.env.CLINICAL_AI_BASE = previousBase;
    await stop(server);
    await stop(attacker);
  }
});
