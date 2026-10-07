import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scripts/supervise.mjs");
const sleep = "setInterval(() => {}, 1000)";

function run(commands) {
  const args = [script];
  for (const command of commands) args.push("--", ...command);
  const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });
  return {
    child,
    log: () => log,
    exited() {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error(`supervisor stayed up\n${log}`));
        }, 8000);
        child.once("exit", (code) => {
          clearTimeout(timer);
          resolve(code);
        });
      });
    },
  };
}

test("a child that exits 0 makes the supervisor exit non-zero", async () => {
  const supervisor = run([
    [process.execPath, "-e", sleep],
    [process.execPath, "-e", "process.exit(0)"],
  ]);
  const code = await supervisor.exited();
  assert.notEqual(code, 0);
  assert.equal(code, 1);
});

test("a child that exits 2 is preserved as a non-zero supervisor exit", async () => {
  const supervisor = run([
    [process.execPath, "-e", sleep],
    [process.execPath, "-e", "process.exit(2)"],
  ]);
  const code = await supervisor.exited();
  assert.equal(code, 2);
});

test("SIGTERM to the supervisor exits 0", async () => {
  const supervisor = run([
    [process.execPath, "-e", sleep],
    [process.execPath, "-e", sleep],
  ]);
  await new Promise((resolve) => setTimeout(resolve, 200));
  supervisor.child.kill("SIGTERM");
  const code = await supervisor.exited();
  assert.equal(code, 0);
});
