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
    [process.execPath, "-e", sleep, "node_modules/next/dist/bin/next", "start"],
    [process.execPath, "-e", "process.exit(0)", "server/index.js"],
  ]);
  const code = await supervisor.exited();
  assert.notEqual(code, 0);
  assert.equal(code, 1);
  assert.match(supervisor.log(), /\[supervise\] proxy exited \(code 0\)\. Container exit 1\./);
  assert.doesNotMatch(supervisor.log(), /next exited/);
});

test("a child that exits 2 is preserved as a non-zero supervisor exit", async () => {
  const supervisor = run([
    [process.execPath, "-e", sleep, "server/index.js"],
    [process.execPath, "-e", "process.exit(2)", "node_modules/next/dist/bin/next", "start"],
  ]);
  const code = await supervisor.exited();
  assert.equal(code, 2);
  assert.match(supervisor.log(), /\[supervise\] next exited \(code 2\)\. Container exit 2\./);
});

test("a child signal is logged and the container exits 1", async () => {
  const supervisor = run([
    [process.execPath, "-e", sleep, "node_modules/next/dist/bin/next", "start"],
    [process.execPath, "-e", "process.kill(process.pid, 'SIGTERM')", "server/index.js"],
  ]);
  const code = await supervisor.exited();
  assert.equal(code, 1);
  assert.match(supervisor.log(), /\[supervise\] proxy exited \(signal SIGTERM\)\. Container exit 1\./);
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
  assert.match(supervisor.log(), /\[supervise\] shutting down on SIGTERM\. Container exit 0\./);
  assert.doesNotMatch(supervisor.log(), /exited \(/);
});

test("SIGINT to the supervisor exits 0", async () => {
  const supervisor = run([
    [process.execPath, "-e", sleep],
    [process.execPath, "-e", sleep],
  ]);
  await new Promise((resolve) => setTimeout(resolve, 200));
  supervisor.child.kill("SIGINT");
  const code = await supervisor.exited();
  assert.equal(code, 0);
  assert.match(supervisor.log(), /\[supervise\] shutting down on SIGINT\. Container exit 0\./);
  assert.doesNotMatch(supervisor.log(), /exited \(/);
});
