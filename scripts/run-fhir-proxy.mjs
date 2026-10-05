import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const probe = spawnSync(process.execPath, ["--use-system-ca", "-e", "process.exit(0)"], { stdio: "ignore" });
const args = probe.status === 0 ? ["--use-system-ca", "server/index.js"] : ["server/index.js"];
if (probe.status !== 0) {
  console.warn("[FHIR Proxy] This Node does not accept --use-system-ca. Starting without that flag.");
}

const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env, cwd: root });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
