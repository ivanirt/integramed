import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import { credentialLinkedToPractitioner, findCredentialAccount } from "../src/lib/account-lookup.js";
import { blankAccount, readAccounts, writeAccounts } from "../src/lib/credentials.ts";
import { passwordChangeRequired } from "../src/lib/must-change.js";
import {
  CHANGE_PASSWORD_ACTION_ID,
  CHANGE_PASSWORD_LIMIT,
  SAME_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR,
  allowPasswordChangeAttempt,
  commitPasswordChange,
  evaluatePasswordChange,
  CHANGE_PASSWORD_IP_LIMIT,
  passwordChangeClientAddress,
  resetPasswordChangeLimits,
} from "../src/lib/password-change.ts";
import {
  CHANGE_PASSWORD_PATH,
  LOGOUT_PATH,
  PASSWORD_CHANGE_REQUIRED_ERROR,
  passwordChangeAccess,
} from "../src/lib/password-change-gate.ts";
import { isSessionPasswordCurrent } from "../src/lib/session-stamp.js";
import { logoutRequestAllowed } from "../src/lib/request-origin.ts";
import { verifySessionToken } from "../src/lib/session-edge.ts";
import { buildSessionToken } from "../src/lib/session-token.ts";
import { appendHiddenChunk, isPasswordArgument } from "../scripts/cli-password.ts";

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SECRET = "s".repeat(48);

function password() {
  return `${randomBytes(18).toString("base64url")}a1`;
}

function run(script: string, args: string[], env: NodeJS.ProcessEnv, input?: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string; spawnArgs: string[] }>((resolve, reject) => {
    const spawnArgs = ["--experimental-strip-types", script, ...args];
    const child = spawn(process.execPath, spawnArgs, {
      cwd: repo,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr, spawnArgs }));
    child.stdin.end(input ?? "");
  });
}

function cliEnv(authRoot: string, fhirRoot: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, FHIR_MODE: "local", INTEGRAMED_AUTH_ROOT: authRoot, INTEGRAMED_FHIR_ROOT: fhirRoot };
  delete env.CREATE_USER_PASSWORD;
  delete env.SET_PASSWORD;
  return env;
}

test("a missing mustChangePassword flag reads as false", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  fs.writeFileSync(
    path.join(dir, "accounts.json"),
    JSON.stringify({
      revision: 1,
      accounts: [{ practitionerId: "prac-1", email: "a@clinic.test", passwordHash: null, passwordRequired: true }],
    }),
  );
  const loaded = readAccounts(dir);
  assert.equal(loaded[0]?.mustChangePassword, false);
  const fresh = blankAccount("prac-2", "b@clinic.test", true);
  assert.equal(fresh.mustChangePassword, false);
  writeAccounts([fresh], dir);
  assert.equal(readAccounts(dir)[0]?.mustChangePassword, false);
});

test("password change is required only from accounts.json and fails closed", () => {
  const accounts = [{ practitionerId: "prac-1", mustChangePassword: true }];
  assert.equal(passwordChangeRequired({ id: "prac-1", mustChange: false }, accounts, true), true);
  assert.equal(passwordChangeRequired({ id: "prac-1" }, accounts, true), true);
  assert.equal(passwordChangeRequired({ id: "prac-1", mustChange: true }, [{ practitionerId: "prac-1" }], true), false);
  assert.equal(passwordChangeRequired({ id: "prac-1", mustChange: true }, [{ practitionerId: "prac-1", mustChangePassword: false }], true), false);
  assert.equal(passwordChangeRequired({ id: "prac-1" }, [], false), true);
  assert.equal(CHANGE_PASSWORD_ACTION_ID, "changePassword");
});

test("a must-change session is limited to the change screen, logout, and static assets", () => {
  const denied = [
    ["/", "GET"],
    ["/perfil", "GET"],
    ["/pacientes/abc", "GET"],
    ["/agenda", "POST"],
    ["/api/cie", "GET"],
    ["/api/staff/me", "GET"],
    ["/api/ai/clinical", "POST"],
    ["/api/auth", "POST"],
    ["/fhir/Patient", "GET"],
    ["/api/fhir/Patient", "GET"],
    ["/api/cie.js", "GET"],
    ["/api/cie.js", "POST"],
    ["/fhir/Patient/1.txt", "GET"],
    ["/fhir/Patient/1.js", "POST"],
  ] as const;
  for (const [pathname, method] of denied) {
    const access = passwordChangeAccess(pathname, method);
    assert.notEqual(access, "allow", pathname);
    if (pathname.startsWith("/api") || pathname.startsWith("/fhir")) assert.equal(access, "deny", pathname);
    else assert.equal(access, "redirect", `${pathname} ${access}`);
  }
  for (const [pathname, method] of [
    [CHANGE_PASSWORD_PATH, "GET"],
    [CHANGE_PASSWORD_PATH, "POST"],
    [LOGOUT_PATH, "POST"],
    ["/acceso", "GET"],
    ["/favicon.ico", "GET"],
    ["/healthz", "GET"],
    ["/_next/static/chunk.js", "GET"],
    ["/acceso/recuperar", "GET"],
    ["/acceso/restablecer", "GET"],
  ] as const) {
    assert.equal(passwordChangeAccess(pathname, method), "allow", pathname);
  }
  assert.equal(passwordChangeAccess("/ci-static.txt", "GET"), "redirect");
  assert.equal(passwordChangeAccess("/pacientes/abc.js", "POST"), "redirect");
  assert.equal(passwordChangeAccess("/cuenta/contrasena/extra", "GET"), "redirect");
  assert.equal(passwordChangeAccess("/acceso/otro", "GET"), "redirect");
  assert.equal(PASSWORD_CHANGE_REQUIRED_ERROR.includes("contraseña"), true);

  const middleware = fs.readFileSync(path.join(repo, "src/middleware.ts"), "utf8");
  assert.match(middleware, /passwordChangeAccess/);
  assert.match(middleware, /next-action/);
  const requireSrc = fs.readFileSync(path.join(repo, "src/lib/require.ts"), "utf8");
  assert.match(requireSrc, /mustChangePassword/);
  const fhir = fs.readFileSync(path.join(repo, "src/lib/fhir.ts"), "utf8");
  assert.match(fhir, /mustChangePassword/);
  const actions = fs.readFileSync(path.join(repo, "src/lib/actions.ts"), "utf8");
  const bodies = actions.split("export async function ").slice(1);
  assert.ok(bodies.length > 10);
  for (const body of bodies) {
    assert.match(body, /await require(?:User|Admin|SelfOrAdmin)/);
  }
  for (const file of [
    "src/app/api/cie/route.ts",
    "src/app/api/ai/clinical/route.ts",
    "src/app/api/staff/me/route.ts",
    "src/app/api/auth/route.ts",
  ]) {
    assert.match(fs.readFileSync(path.join(repo, file), "utf8"), /PASSWORD_CHANGE_REQUIRED_ERROR/);
  }
  const action = fs.readFileSync(path.join(repo, "src/app/cuenta/contrasena/actions.ts"), "utf8");
  assert.match(action, /export async function changePasswordAction/);
  assert.match(action, /allowPasswordChangeAttempt/);
  assert.equal(action.includes("requireUser"), false);
  assert.match(fs.readFileSync(path.join(repo, "server/sessionAuth.js"), "utf8"), /passwordChangeRequired/);
});

test("changing the password clears the flag, rejects the old session, and enforces policy", { timeout: 60_000 }, async () => {
  const current = password();
  const next = password();
  const hash = await bcrypt.hash(current, 4);
  const account = blankAccount("prac-1", "admin@clinic.test", true);
  account.passwordHash = hash;
  account.passwordChangedAt = 100;
  account.mustChangePassword = true;

  const same = await evaluatePasswordChange({
    account,
    currentPassword: current,
    nextPassword: current,
    confirm: current,
  });
  assert.deepEqual(same, { ok: false, error: SAME_PASSWORD_ERROR });

  const wrong = await evaluatePasswordChange({
    account,
    currentPassword: password(),
    nextPassword: next,
    confirm: next,
  });
  assert.deepEqual(wrong, { ok: false, error: WRONG_PASSWORD_ERROR });

  const weak = await evaluatePasswordChange({
    account,
    currentPassword: current,
    nextPassword: "abcdefghijkl",
    confirm: "abcdefghijkl",
  });
  assert.equal(weak.ok, false);
  if (!weak.ok) assert.match(weak.error, /número/);

  const mismatch = await evaluatePasswordChange({
    account,
    currentPassword: current,
    nextPassword: next,
    confirm: password(),
  });
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.match(mismatch.error, /no coinciden/);

  const changed = await evaluatePasswordChange({
    account,
    currentPassword: current,
    nextPassword: next,
    confirm: next,
  });
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  const accounts = [account];
  assert.equal(commitPasswordChange(accounts, "prac-1", changed.passwordHash, 500, 100), true);
  assert.equal(accounts[0]?.mustChangePassword, false);
  assert.equal(accounts[0]?.passwordChangedAt, 500);
  assert.equal(await bcrypt.compare(next, accounts[0]?.passwordHash || ""), true);
  assert.equal(isSessionPasswordCurrent({ id: "prac-1", pwdAt: 100 }, accounts), false);
  assert.equal(isSessionPasswordCurrent({ id: "prac-1", pwdAt: 500 }, accounts), true);

  const stale = buildSessionToken(
    { id: "prac-1", name: "Admin", login: "admin@clinic.test", role: "admin", pwdAt: 100, mustChange: true, exp: Date.now() + 60_000 },
    SECRET,
  );
  const issued = buildSessionToken(
    { id: "prac-1", name: "Admin", login: "admin@clinic.test", role: "admin", pwdAt: 500, mustChange: false, exp: Date.now() + 60_000 },
    SECRET,
  );
  assert.equal((await verifySessionToken(stale, SECRET))?.mustChange, true);
  assert.equal((await verifySessionToken(issued, SECRET))?.mustChange, false);
  assert.equal(isSessionPasswordCurrent({ id: "prac-1", pwdAt: 100 }, accounts), false);

  const voluntary = blankAccount("prac-2", "doc@clinic.test", true);
  voluntary.passwordHash = hash;
  voluntary.passwordChangedAt = 20;
  voluntary.mustChangePassword = false;
  const again = await evaluatePasswordChange({
    account: voluntary,
    currentPassword: current,
    nextPassword: next,
    confirm: next,
  });
  assert.equal(again.ok, true);
  if (!again.ok) return;
  const second = [voluntary];
  assert.equal(commitPasswordChange(second, "prac-2", again.passwordHash, 80, 20), true);
  assert.equal(second[0]?.mustChangePassword, false);
  assert.equal(isSessionPasswordCurrent({ id: "prac-2", pwdAt: 20 }, second), false);
  assert.equal(isSessionPasswordCurrent({ id: "prac-2", pwdAt: 80 }, second), true);
});

test("change-password attempts are rate limited", () => {
  resetPasswordChangeLimits();
  const now = 1_000_000;
  for (let i = 0; i < CHANGE_PASSWORD_LIMIT; i += 1) {
    assert.equal(allowPasswordChangeAttempt("prac-1", "10.0.0.1", now + i), true);
  }
  assert.equal(allowPasswordChangeAttempt("prac-1", "10.0.0.2", now + 10), false);
  assert.equal(allowPasswordChangeAttempt("prac-2", "10.0.0.1", now + 10), true);
  resetPasswordChangeLimits();
});

test("an account linked only by email does not authorize the new practitioner", () => {
  const accounts = [
    { practitionerId: "prac-old", email: "admin@clinic.test", mustChangePassword: true, passwordChangedAt: 500 },
  ];
  const session = { id: "prac-new", login: "admin@clinic.test", pwdAt: 900, mustChange: false };
  const account = findCredentialAccount(accounts, session);
  assert.equal(account?.practitionerId, "prac-old");
  assert.equal(credentialLinkedToPractitioner(account, "prac-new"), false);
  assert.equal(credentialLinkedToPractitioner(findCredentialAccount(accounts, { id: "prac-old" }), "prac-old"), true);
  assert.equal(passwordChangeRequired(session, accounts, true), true);
  assert.equal(isSessionPasswordCurrent(session, accounts), false);

  const username = { id: "prac-admin", login: "okuser", pwdAt: 900, mustChange: false };
  assert.equal(findCredentialAccount(accounts, { id: username.id, email: undefined }), undefined);
  assert.equal(isSessionPasswordCurrent(username, accounts), false);
  assert.equal(passwordChangeRequired(username, accounts, true), true);
  const claimed = { id: "prac-admin", email: "admin@clinic.test", login: "okuser", pwdAt: 900 };
  assert.equal(findCredentialAccount(accounts, { id: claimed.id, email: claimed.email })?.practitionerId, "prac-old");
  assert.equal(isSessionPasswordCurrent(claimed, accounts), false);
  assert.equal(isSessionPasswordCurrent({ id: "seed-yeshua", login: "seed-yeshua", pwdAt: 0 }, accounts), true);
});

test("the change-password limiter ignores proxy headers unless TRUST_PROXY=1", () => {
  const header = (map: Record<string, string>) => (name: string) => map[name] ?? null;
  const spoofed = header({ "x-real-ip": "10.1.1.1", "x-forwarded-for": "1.1.1.1, 10.0.0.8" });
  assert.equal(passwordChangeClientAddress(spoofed, { trustProxy: false }), null);
  assert.equal(passwordChangeClientAddress(header({ "x-real-ip": "10.1.1.1" }), { trustProxy: true }), "10.1.1.1");
  assert.equal(
    passwordChangeClientAddress(header({ "x-forwarded-for": "1.1.1.1, 10.0.0.8" }), { trustProxy: true }),
    "10.0.0.8",
  );
  assert.equal(
    passwordChangeClientAddress(header({}), { trustProxy: false, remoteAddress: "192.0.2.10" }),
    "192.0.2.10",
  );

  resetPasswordChangeLimits();
  const now = 1_700_000_000_000;
  for (let i = 0; i < CHANGE_PASSWORD_LIMIT; i += 1) {
    assert.equal(allowPasswordChangeAttempt("prac-a", null, now + i), true);
  }
  assert.equal(allowPasswordChangeAttempt("prac-a", null, now + 20), false);
  assert.equal(allowPasswordChangeAttempt("prac-b", null, now + 20), true);

  resetPasswordChangeLimits();
  for (let i = 0; i < CHANGE_PASSWORD_IP_LIMIT; i += 1) {
    assert.equal(allowPasswordChangeAttempt(`ip-user-${i}`, "10.0.0.8", now + i), true);
  }
  assert.equal(allowPasswordChangeAttempt("prac-next", "10.0.0.8", now + 40), false);
  assert.equal(allowPasswordChangeAttempt("prac-next", "10.0.0.9", now + 40), true);
  resetPasswordChangeLimits();
});

test("logout rejects a foreign Origin and a null Origin", () => {
  const headers = (map: Record<string, string>) => ({ get: (name: string) => map[name.toLowerCase()] ?? null });
  assert.equal(logoutRequestAllowed({ headers: headers({}) }), true);
  assert.equal(logoutRequestAllowed({ headers: headers({ origin: "https://clinic.test", host: "clinic.test" }) }), true);
  assert.equal(
    logoutRequestAllowed({ headers: headers({ origin: "https://evil.test", host: "clinic.test" }) }),
    false,
  );
  assert.equal(logoutRequestAllowed({ headers: headers({ origin: "null", host: "clinic.test" }) }), false);
  assert.equal(
    logoutRequestAllowed({
      headers: headers({ origin: "https://clinic.test", "x-forwarded-host": "clinic.test", host: "internal" }),
    }),
    false,
  );
  const production = { NODE_ENV: "production", APP_BASE_URL: "https://clinic.test" };
  assert.equal(
    logoutRequestAllowed(
      { headers: headers({ origin: "https://clinic.test", "x-forwarded-host": "evil.test", host: "internal" }) },
      production,
    ),
    true,
  );
  assert.equal(
    logoutRequestAllowed({ headers: headers({ origin: "http://clinic.test", host: "clinic.test" }) }, production),
    false,
  );
  assert.equal(
    logoutRequestAllowed({ headers: headers({ origin: "https://evil.test", host: "clinic.test" }) }, production),
    false,
  );
  assert.equal(
    logoutRequestAllowed({ headers: headers({ origin: "https://clinic.test" }) }, { NODE_ENV: "production" }),
    false,
  );
});

test("create-user and set-password round-trip mustChangePassword without the password in argv", { timeout: 120_000 }, async () => {
  const authRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const fhirRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-"));
  const env = cliEnv(authRoot, fhirRoot);
  const email = "admin@clinic.test";
  const temporary = password();
  const replacement = password();
  const ignored = password();

  const created = await run(
    "scripts/create-user.ts",
    ["--email", email, "--role", "admin", "--must-change"],
    env,
    `${temporary}\n`,
  );
  assert.equal(created.code, 0, created.stderr);
  assert.equal(created.spawnArgs.includes(temporary), false);
  assert.equal(`${created.stdout}\n${created.stderr}`.includes(temporary), false);
  assert.equal(fs.readFileSync(path.join(authRoot, "accounts.json"), "utf8").includes(temporary), false);
  const account = readAccounts(authRoot)[0];
  assert.equal(account?.email, email);
  assert.equal(account?.mustChangePassword, true);
  assert.equal(await bcrypt.compare(temporary, account?.passwordHash || ""), true);

  const kept = await run("scripts/set-password.ts", [email], env, `${replacement}\n`);
  assert.equal(kept.code, 0, kept.stderr);
  assert.equal(kept.spawnArgs.includes(replacement), false);
  assert.equal(`${kept.stdout}\n${kept.stderr}`.includes(replacement), false);
  const afterDefault = readAccounts(authRoot)[0];
  assert.equal(afterDefault?.mustChangePassword, true);
  const cleared = await run("scripts/set-password.ts", [email, "--no-must-change"], env, `${replacement}\n`);
  assert.equal(cleared.code, 0, cleared.stderr);
  const afterClear = readAccounts(authRoot)[0];
  assert.equal(afterClear?.mustChangePassword, false);
  assert.equal(await bcrypt.compare(replacement, afterClear?.passwordHash || ""), true);
  assert.notEqual(afterClear?.passwordChangedAt, account?.passwordChangedAt);

  const forced = await run("scripts/set-password.ts", [email, "--must-change"], env, `${temporary}\n`);
  assert.equal(forced.code, 0, forced.stderr);
  assert.equal(forced.spawnArgs.includes(temporary), false);
  assert.equal(`${forced.stdout}\n${forced.stderr}`.includes(temporary), false);
  const afterForce = readAccounts(authRoot)[0];
  assert.equal(afterForce?.mustChangePassword, true);
  assert.equal(await bcrypt.compare(temporary, afterForce?.passwordHash || ""), true);
  assert.equal(isSessionPasswordCurrent({ id: account?.practitionerId, pwdAt: account?.passwordChangedAt }, [afterForce]), false);

  const warned = await run(
    "scripts/create-user.ts",
    ["--email", "otra@clinic.test", "--role", "doctor", "--must-change"],
    { ...env, CREATE_USER_PASSWORD: ignored },
    `${replacement}\n`,
  );
  assert.equal(warned.code, 0, warned.stderr);
  assert.match(warned.stderr, /CREATE_USER_PASSWORD/);
  assert.match(warned.stderr, /ignora/);
  assert.equal(warned.stderr.includes(ignored), false);
  assert.equal(warned.stdout.includes(ignored), false);
  assert.equal(warned.stderr.includes(replacement), false);
  const other = readAccounts(authRoot).find((item) => item.email === "otra@clinic.test");
  assert.equal(other?.mustChangePassword, true);
  assert.equal(await bcrypt.compare(replacement, other?.passwordHash || ""), true);
  assert.equal(await bcrypt.compare(ignored, other?.passwordHash || ""), false);

  const rejected = await run("scripts/set-password.ts", ["--password", email], env, "");
  assert.notEqual(rejected.code, 0);
  assert.equal(`${rejected.stdout}\n${rejected.stderr}`.includes(ignored), false);
  assert.equal(rejected.stderr.includes(email), false);
  assert.match(rejected.stderr, /argumento/);
});

function runPty(args: string[], env: NodeJS.ProcessEnv, first: string, second: string) {
  const script = `
import os, pty, select, sys
first = sys.stdin.readline().rstrip("\\n")
second = sys.stdin.readline().rstrip("\\n")
env = os.environ.copy()
cmd = ["node", "--experimental-strip-types", *sys.argv[1:]]
pid, fd = pty.fork()
if pid == 0:
    os.chdir(${JSON.stringify(repo)})
    os.execvpe(cmd[0], cmd, env)
buf = b""
stage = 0
while True:
    ready, _, _ = select.select([fd], [], [], 20)
    if not ready:
        break
    try:
        chunk = os.read(fd, 4096)
    except OSError:
        break
    if not chunk:
        break
    buf += chunk
    text = buf.decode("utf-8", "replace")
    if stage == 0 and "Contrase" in text:
        os.write(fd, (first + "\\n").encode())
        stage = 1
    elif stage == 1 and "Repite" in text:
        os.write(fd, (second + "\\n").encode())
        stage = 2
_, status = os.waitpid(pid, 0)
sys.stdout.buffer.write(buf)
sys.exit(os.waitstatus_to_exitcode(status))
`;
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("python3", ["-c", script, ...args], {
      cwd: repo,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output: output + err }));
    child.stdin.end(`${first}\n${second}\n`);
  });
}

test("the interactive prompt hides the password and requires confirmation", { timeout: 60_000 }, async () => {
  const authRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-"));
  const fhirRoot = fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-"));
  const env = cliEnv(authRoot, fhirRoot);
  const email = "tty@clinic.test";
  const temporary = password();
  const other = password();
  const args = ["scripts/create-user.ts", "--email", email, "--role", "nurse", "--must-change"];

  const mismatch = await runPty(args, env, temporary, other);
  assert.notEqual(mismatch.code, 0);
  assert.match(mismatch.output, /no coinciden/);
  assert.equal(mismatch.output.includes(temporary), false);
  assert.equal(mismatch.output.includes(other), false);
  assert.equal(readAccounts(authRoot).length, 0);

  const created = await runPty(args, env, temporary, temporary);
  assert.equal(created.code, 0, created.output);
  assert.equal(created.output.includes(temporary), false);
  assert.match(created.output, /Contraseña:/);
  assert.match(created.output, /Repite la contraseña:/);
  const account = readAccounts(authRoot)[0];
  assert.equal(account?.mustChangePassword, true);
  assert.equal(await bcrypt.compare(temporary, account?.passwordHash || ""), true);
  assert.equal(fs.readFileSync(path.join(authRoot, "accounts.json"), "utf8").includes(temporary), false);
});

test("a pasted second line is rejected and attached password flags are not echoed", async () => {
  assert.deepEqual(appendHiddenChunk("", "linea-uno\nlinea-dos\n"), { kind: "reject" });
  assert.deepEqual(appendHiddenChunk("linea-", "uno\n"), { kind: "submit", value: "linea-uno" });
  assert.equal(isPasswordArgument("--prefix"), false);
  assert.equal(isPasswordArgument("--must-change"), false);
  const secret = password();
  for (const flag of [`-p${secret}`, `--password=${secret}`, `--pass${secret}`]) {
    assert.equal(isPasswordArgument(flag), true);
    const rejected = await run("scripts/set-password.ts", [flag], cliEnv(fs.mkdtempSync(path.join(os.tmpdir(), "integramed-auth-")), fs.mkdtempSync(path.join(os.tmpdir(), "integramed-fhir-"))), "");
    assert.notEqual(rejected.code, 0);
    assert.equal(`${rejected.stdout}\n${rejected.stderr}`.includes(secret), false);
    assert.match(rejected.stderr, /argumento/);
  }
});

test("operator messages do not tell anyone to put a password in the environment", () => {
  for (const file of [
    "src/instrumentation-node.ts",
    "src/lib/mailer.ts",
    "src/lib/password-reset.ts",
    "scripts/dev.mjs",
    "README.md",
    ".env.example",
  ]) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("con SET_PASSWORD"), false, file);
    assert.equal(text.includes("SET_PASSWORD='"), false, file);
    assert.equal(text.includes('SET_PASSWORD="'), false, file);
  }
});
