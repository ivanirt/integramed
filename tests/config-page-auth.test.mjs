import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { signSession } from "../server/sessionAuth.js";

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SESSION_SECRET = `s${"S".repeat(47)}`;
const FHIR_PROXY_SECRET = `p${"P".repeat(47)}`;

const ADMIN_MARKERS = [
  ["/config/fhir", "Conexión FHIR"],
  ["/config/fhir", "FHIR_AUTH_TOKEN"],
  ["/config/fhir", "FHIR_BASE_URL"],
  ["/config/fhir", "FHIR_MODE"],
  ["/config/horario", "Schedule de la clínica"],
  ["/config/festivos", "Cierres de clínica"],
  ["/config/servicios", "HealthcareService"],
  ["/config/sedes", "Organizaciones"],
  ["/config/modulos", "Visibilidad de la clínica"],
  ["/config/integrativa", "Catálogo de la clínica"],
  ["/personal", "Practitioner y PractitionerRole"],
];

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function spawnLogged(command, args, env) {
  const child = spawn(command, args, { cwd: repo, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  const add = (chunk) => {
    log += chunk.toString();
    if (log.length > 200_000) log = log.slice(-100_000);
  };
  child.stdout.on("data", add);
  child.stderr.on("data", add);
  return { child, text: () => log };
}

async function waitFor(label, fn, timeoutMs = 120_000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      if (await fn()) return;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready (${last})`);
}

function stop(child) {
  if (!child || child.killed) return Promise.resolve();
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, 2000).unref();
  });
}

function cookie(role, id) {
  const token = signSession(
    { id, name: "Prueba", login: "prueba", role, pwdAt: Date.now() },
    SESSION_SECRET,
  );
  return `integramed_session=${token}`;
}

test("non-admin config and personal pages do not return rendered admin content", { timeout: 180_000 }, async () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-"));
  const authRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const proxyPort = await freePort();
  const webPort = await freePort();
  const baseEnv = { ...process.env };
  delete baseEnv.FHIR_PROXY_NO_LISTEN;
  baseEnv.SESSION_SECRET = SESSION_SECRET;
  baseEnv.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
  baseEnv.FHIR_MODE = "local";
  baseEnv.INTEGRAMED_DATA_ROOT = dataRoot;
  baseEnv.INTEGRAMED_FHIR_ROOT = path.join(dataRoot, "fhir");
  baseEnv.INTEGRAMED_AUTH_ROOT = authRoot;
  baseEnv.CLINICAL_AI_KEY = "";
  baseEnv.NEXT_TELEMETRY_DISABLED = "1";

  const proxy = spawnLogged(process.execPath, ["server/index.js"], {
    ...baseEnv,
    NODE_ENV: "development",
    PORT: String(proxyPort),
  });
  const web = spawnLogged(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--turbopack", "-p", String(webPort), "-H", "127.0.0.1"],
    {
      ...baseEnv,
      NODE_ENV: "development",
      FHIR_PROXY_URL: `http://127.0.0.1:${proxyPort}`,
    },
  );
  const origin = `http://127.0.0.1:${webPort}`;
  try {
    await waitFor("proxy", async () => {
      const res = await fetch(`http://127.0.0.1:${proxyPort}/api/health`);
      return res.status === 401;
    });
    await waitFor("next", async () => {
      const res = await fetch(`${origin}/acceso`);
      return res.status === 200;
    });

    const doctorCookie = cookie("doctor", "prac-doctor");
    const adminCookie = cookie("admin", "prac-admin");

    const home = await fetch(`${origin}/`, {
      headers: { cookie: doctorCookie },
      redirect: "manual",
    });
    assert.equal(home.status, 200);

    async function deniedPage(pathname, headers = {}) {
      const res = await fetch(`${origin}${pathname}`, {
        headers: { cookie: doctorCookie, ...headers },
        redirect: "manual",
      });
      const text = await res.text();
      assert.ok(res.status === 307 || res.status === 403, `${pathname} status ${res.status}`);
      assert.notEqual(res.status, 200, pathname);
      const location = res.headers.get("location") || "";
      if (res.status === 307) assert.match(location, /aviso=/, pathname);
      return text;
    }

    const fhirBody = await deniedPage("/config/fhir");
    for (const marker of ["Conexión FHIR", "FHIR_AUTH_TOKEN", "FHIR_BASE_URL", "FHIR_MODE", "Servidor:"]) {
      assert.equal(fhirBody.includes(marker), false, marker);
    }
    const rscBody = await deniedPage("/config/fhir", { RSC: "1", Accept: "text/x-component" });
    for (const marker of ["Conexión FHIR", "FHIR_AUTH_TOKEN", "FHIR_BASE_URL"]) {
      assert.equal(rscBody.includes(marker), false, `rsc ${marker}`);
    }

    for (const [pathname, marker] of ADMIN_MARKERS) {
      const body = await deniedPage(pathname);
      assert.equal(body.includes(marker), false, `${pathname} leaked ${marker}`);
    }

    const pharmacist = await fetch(`${origin}/config/fhir`, {
      headers: { cookie: cookie("pharmacist", "prac-pharm") },
      redirect: "manual",
    });
    const pharmacistBody = await pharmacist.text();
    assert.ok(pharmacist.status === 307 || pharmacist.status === 403);
    assert.equal(pharmacistBody.includes("Conexión FHIR"), false);

    const adminFhir = await fetch(`${origin}/config/fhir`, {
      headers: { cookie: adminCookie },
      redirect: "manual",
    });
    const adminBody = await adminFhir.text();
    assert.equal(adminFhir.status, 200, adminBody.slice(0, 500));
    assert.match(adminBody, /Conexión FHIR/);
    assert.match(adminBody, /FHIR_AUTH_TOKEN/);
    assert.equal(fhirBody.includes("Conexión FHIR"), false);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${detail}\n--- web ---\n${web.text().slice(-4000)}\n--- proxy ---\n${proxy.text().slice(-2000)}`);
  } finally {
    await Promise.all([stop(web.child), stop(proxy.child)]);
  }
});
