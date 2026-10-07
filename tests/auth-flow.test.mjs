import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import { createLocalFhirStore } from "../server/localFhir.js";
import { blankAccount, writeAccounts } from "../src/lib/credentials.ts";
import { buildSessionToken } from "../src/lib/session-token.ts";

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LOGIN_SYSTEM = "https://integramed.app/fhir/login";
const ROLE_SYSTEM = "https://integramed.app/fhir/role";
const SESSION_SECRET = `s${"S".repeat(47)}`;
const FHIR_PROXY_SECRET = `p${"P".repeat(47)}`;

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

function practitioner(id, email, role, given) {
  return {
    resourceType: "Practitioner",
    id,
    active: true,
    name: [{ use: "official", family: "Prueba", given: [given] }],
    telecom: [{ system: "email", value: email }],
    identifier: [
      { system: LOGIN_SYSTEM, value: email },
      { system: ROLE_SYSTEM, value: role },
    ],
  };
}

function roleResource(id, practitionerId, role) {
  return {
    resourceType: "PractitionerRole",
    id,
    active: true,
    practitioner: { reference: `Practitioner/${practitionerId}` },
    code: [{ coding: [{ system: ROLE_SYSTEM, code: role }] }],
  };
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
  return {
    child,
    text: () => log,
  };
}

async function waitFor(label, fn, timeoutMs = 90_000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await fn();
      if (ok) return;
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

test("login, forgot-password, and reset go through Next and the real proxy", { timeout: 180_000 }, async () => {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-"));
  const authRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const adminEmail = "ivanirt@gmail.com";
  const doctorEmail = "qa+doctor@integramed.local";
  const doctorPassword = `${randomBytes(18).toString("base64url")}a1`;
  const nextPassword = `${randomBytes(18).toString("base64url")}b2`;
  const temporaryPassword = `${randomBytes(18).toString("base64url")}c3`;
  const orphanPassword = `${randomBytes(18).toString("base64url")}d4`;
  const tempEmail = "qa+temp@integramed.local";
  const orphanEmail = "qa+orphan@integramed.local";
  const store = createLocalFhirStore(dataRoot);
  store.writeResource(practitioner("prac-admin", adminEmail, "admin", "Ivan"));
  store.writeResource(roleResource("role-admin", "prac-admin", "admin"));
  store.writeResource(practitioner("prac-doctor", doctorEmail, "doctor", "QA"));
  store.writeResource(roleResource("role-doctor", "prac-doctor", "doctor"));
  store.writeResource(practitioner("prac-temp", tempEmail, "admin", "Temp"));
  store.writeResource(roleResource("role-temp", "prac-temp", "admin"));
  store.writeResource(practitioner("prac-new", orphanEmail, "admin", "Nueva"));
  store.writeResource(roleResource("role-new", "prac-new", "admin"));
  const adminAccount = blankAccount("prac-admin", adminEmail, true);
  const doctorAccount = blankAccount("prac-doctor", doctorEmail, true);
  doctorAccount.passwordHash = await bcrypt.hash(doctorPassword, 4);
  doctorAccount.passwordChangedAt = 10;
  const tempAccount = blankAccount("prac-temp", tempEmail, true);
  tempAccount.passwordHash = await bcrypt.hash(temporaryPassword, 4);
  tempAccount.passwordChangedAt = 500;
  tempAccount.mustChangePassword = true;
  const orphanAccount = blankAccount("prac-old", orphanEmail, true);
  orphanAccount.passwordHash = await bcrypt.hash(orphanPassword, 4);
  orphanAccount.passwordChangedAt = 500;
  orphanAccount.mustChangePassword = true;
  writeAccounts([adminAccount, doctorAccount, tempAccount, orphanAccount], authRoot);

  const proxyPort = await freePort();
  const webPort = await freePort();
  const baseEnv = { ...process.env };
  delete baseEnv.FHIR_PROXY_NO_LISTEN;
  delete baseEnv.SMTP_HOST;
  delete baseEnv.SMTP_USER;
  delete baseEnv.SMTP_PASS;
  delete baseEnv.MAIL_FROM;
  delete baseEnv.CLINIC_MASTER_PASSWORD;
  delete baseEnv.PORT;
  baseEnv.SESSION_SECRET = SESSION_SECRET;
  baseEnv.FHIR_PROXY_SECRET = FHIR_PROXY_SECRET;
  baseEnv.FHIR_MODE = "local";
  baseEnv.INTEGRAMED_DATA_ROOT = dataRoot;
  baseEnv.INTEGRAMED_AUTH_ROOT = authRoot;
  baseEnv.CLINICAL_AI_KEY = "";
  baseEnv.NEXT_TELEMETRY_DISABLED = "1";

  const proxy = spawnLogged(process.execPath, ["server/index.js"], {
    ...baseEnv,
    NODE_ENV: "development",
    FHIR_PROXY_PORT: String(proxyPort),
  });
  const web = spawnLogged(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--turbopack", "-p", String(webPort), "-H", "127.0.0.1"],
    {
      ...baseEnv,
      NODE_ENV: "development",
      FHIR_PROXY_URL: `http://127.0.0.1:${proxyPort}`,
      APP_BASE_URL: `http://127.0.0.1:${webPort}`,
      PASSWORD_RESET_LOG_LINK: "1",
    },
  );

  const origin = `http://127.0.0.1:${webPort}`;
  try {
    await waitFor("proxy", async () => {
      const res = await fetch(`http://127.0.0.1:${proxyPort}/api/internal/staff-lookup`, { method: "POST" });
      return res.status === 401;
    });
    await waitFor("staff record", async () => {
      const res = await fetch(`http://127.0.0.1:${proxyPort}/api/internal/staff-lookup`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-integramed-proxy-secret": FHIR_PROXY_SECRET,
        },
        body: JSON.stringify({ q: adminEmail }),
      });
      return res.status === 200;
    });
    const lookedUp = await fetch(`http://127.0.0.1:${proxyPort}/api/internal/staff-lookup`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-integramed-proxy-secret": FHIR_PROXY_SECRET,
      },
      body: JSON.stringify({ q: adminEmail }),
    });
    const lookedUpBody = await lookedUp.json();
    assert.deepEqual(Object.keys(lookedUpBody).sort(), ["email", "id", "login", "name", "primaryRole", "roles"]);
    assert.equal(lookedUpBody.primaryRole, "admin");
    assert.equal(JSON.stringify(lookedUpBody).includes("resourceType"), false);
    const fhirOnlySecret = await fetch(`http://127.0.0.1:${proxyPort}/api/fhir/Patient`, {
      headers: { "x-integramed-proxy-secret": FHIR_PROXY_SECRET },
    });
    assert.equal(fhirOnlySecret.status, 401);

    await waitFor("next", async () => {
      const res = await fetch(`${origin}/acceso`);
      return res.status === 200;
    });

    const unknownReset = await fetch(`${origin}/api/auth/recuperar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nadie@example.com" }),
    });
    const knownReset = await fetch(`${origin}/api/auth/recuperar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: adminEmail }),
    });
    const unknownBody = await unknownReset.json();
    const knownBody = await knownReset.json();
    assert.equal(unknownReset.status, 200);
    assert.equal(knownReset.status, 200);
    assert.deepEqual(unknownBody, knownBody);
    assert.equal(JSON.stringify(knownBody).includes("token"), false);

    let token = "";
    await waitFor("reset link", async () => {
      const match = web.text().match(/Token: (\S+)/);
      token = match?.[1] || "";
      return Boolean(token);
    }, 20_000);
    assert.equal(web.text().split("Token:").length - 1, 1);
    assert.equal(web.text().includes(nextPassword), false);
    assert.equal(web.text().includes(doctorPassword), false);

    const saved = await fetch(`${origin}/api/auth/restablecer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: nextPassword, confirm: nextPassword }),
    });
    assert.equal(saved.status, 200, web.text().slice(-2000));

    const wrong = await fetch(`${origin}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: adminEmail, password: doctorPassword }),
    });
    assert.equal(wrong.status, 401);

    const login = await fetch(`${origin}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: adminEmail, password: nextPassword }),
    });
    assert.equal(login.status, 200, await login.clone().text());
    const session = login.headers.getSetCookie?.().find((line) => line.startsWith("integramed_session="));
    assert.ok(session);
    const home = await fetch(`${origin}/`, { headers: { cookie: session.split(";")[0] }, redirect: "manual" });
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Inicio/);

    const doctor = await fetch(`${origin}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: doctorEmail, password: doctorPassword }),
    });
    assert.equal(doctor.status, 200, await doctor.clone().text());
    const doctorBody = await doctor.json();
    assert.equal(doctorBody.user.role, "doctor");
    const doctorCookie = doctor.headers.getSetCookie?.().find((line) => line.startsWith("integramed_session="));
    const doctorHome = await fetch(`${origin}/`, {
      headers: { cookie: doctorCookie.split(";")[0] },
      redirect: "manual",
    });
    assert.equal(doctorHome.status, 200);

    const staleCookie = `integramed_session=${buildSessionToken(
      {
        id: "prac-doctor",
        name: "QA",
        login: doctorEmail,
        role: "doctor",
        pwdAt: 1,
        mustChange: false,
        exp: Date.now() + 60_000,
      },
      SESSION_SECRET,
    )}`;
    const staleHome = await fetch(`${origin}/`, { headers: { cookie: staleCookie }, redirect: "manual" });
    assert.equal(staleHome.status, 307);
    assert.match(staleHome.headers.get("location") || "", /\/acceso/);
    assert.equal((await staleHome.text()).includes("Inicio"), false);

    const quietCookie = `integramed_session=${buildSessionToken(
      {
        id: "prac-temp",
        name: "Temp",
        login: tempEmail,
        role: "admin",
        pwdAt: 500,
        mustChange: false,
        exp: Date.now() + 60_000,
      },
      SESSION_SECRET,
    )}`;
    const quietApi = await fetch(`${origin}/api/staff/me`, { headers: { cookie: quietCookie } });
    assert.equal(quietApi.status, 403);
    assert.deepEqual(await quietApi.json(), { error: "Debes cambiar tu contraseña." });
    const quietHome = await fetch(`${origin}/`, { headers: { cookie: quietCookie }, redirect: "manual" });
    assert.equal(quietHome.status, 307);
    assert.match(quietHome.headers.get("location") || "", /\/cuenta\/contrasena$/);
    assert.equal((await quietHome.text()).includes("Inicio"), false);

    const forced = await fetch(`${origin}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: tempEmail, password: temporaryPassword }),
    });
    assert.equal(forced.status, 200);
    const forcedCookie = forced.headers.getSetCookie?.().find((line) => line.startsWith("integramed_session="));
    assert.ok(forcedCookie);
    const action = await fetch(`${origin}/consulta/nueva`, {
      method: "POST",
      headers: {
        cookie: forcedCookie.split(";")[0],
        "next-action": "deadbeef",
        origin,
      },
      redirect: "manual",
    });
    assert.equal(action.status, 403);
    assert.deepEqual(await action.json(), { error: "Debes cambiar tu contraseña." });

    const orphan = await fetch(`${origin}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: orphanEmail, password: orphanPassword }),
    });
    assert.equal(orphan.status, 401);
    assert.deepEqual(await orphan.json(), { error: "Contraseña incorrecta." });
    const emailOnlyCookie = `integramed_session=${buildSessionToken(
      {
        id: "prac-new",
        name: "Nueva",
        login: orphanEmail,
        role: "admin",
        pwdAt: 900,
        mustChange: false,
        exp: Date.now() + 60_000,
      },
      SESSION_SECRET,
    )}`;
    const emailOnlyHome = await fetch(`${origin}/`, { headers: { cookie: emailOnlyCookie }, redirect: "manual" });
    assert.equal(emailOnlyHome.status, 307);
    assert.match(emailOnlyHome.headers.get("location") || "", /\/acceso/);
    const emailOnlyProxy = await fetch(`http://127.0.0.1:${proxyPort}/api/fhir/Patient`, {
      headers: {
        cookie: emailOnlyCookie,
        "x-integramed-proxy-secret": FHIR_PROXY_SECRET,
      },
    });
    assert.equal(emailOnlyProxy.status, 401);
    assert.equal((await emailOnlyProxy.text()).includes("resourceType"), false);

    const foreignLogout = await fetch(`${origin}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: doctorCookie.split(";")[0], origin: "https://evil.test", host: `127.0.0.1:${webPort}` },
    });
    assert.equal(foreignLogout.status, 403);
    const sameLogout = await fetch(`${origin}/api/auth`, {
      method: "POST",
      headers: {
        cookie: doctorCookie.split(";")[0],
        origin,
        host: `127.0.0.1:${webPort}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "logout" }),
    });
    assert.equal(sameLogout.status, 200);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`${detail}\n--- web ---\n${web.text().slice(-4000)}\n--- proxy ---\n${proxy.text().slice(-2000)}`);
  } finally {
    await Promise.all([stop(web.child), stop(proxy.child)]);
  }
});
