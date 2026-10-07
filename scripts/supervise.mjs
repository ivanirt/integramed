// Production process supervisor. PID 1 in the image (`node scripts/supervise.mjs`).
//
// concurrently --kill-others --success first cannot tell these two cases apart:
// - Next exits 0 because it received SIGTERM on its own. `--success first` then
//   reports success, and restart:on-failure does not restart the container.
// - docker stop sends SIGTERM to this process. Next still exits 0, and the
//   proxy's close code is often the string "SIGTERM". `--success all` would
//   then fail an intentional stop. concurrently only rewrites exit codes to 0
//   for SIGINT, not SIGTERM.
//
// This process exits 0 only when it received SIGTERM or SIGINT. Any child that
// exits on its own, including exit code 0, kills the sibling and exits non-zero.

import { spawn } from "node:child_process";

const children = [];
let stopping = false;

function defaultCommands() {
  return [
    [process.execPath, ["server/index.js"]],
    [process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3000"]],
  ];
}

function parseCommands(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return defaultCommands();
  if (args[0] !== "--") {
    console.error("Usage: node scripts/supervise.mjs [-- cmd args -- cmd args]");
    process.exit(1);
  }
  const commands = [];
  let current = [];
  for (const arg of args.slice(1)) {
    if (arg === "--") {
      if (current.length === 0) {
        console.error("supervise: empty command");
        process.exit(1);
      }
      commands.push(current);
      current = [];
    } else {
      current.push(arg);
    }
  }
  if (current.length === 0) {
    console.error("supervise: empty command");
    process.exit(1);
  }
  commands.push(current);
  if (commands.length < 2) {
    console.error("supervise: need at least two commands");
    process.exit(1);
  }
  return commands.map((command) => [command[0], command.slice(1)]);
}

function stillRunning() {
  return children.some((child) => child.exitCode === null && child.signalCode == null);
}

function finish(status) {
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    process.exit(status);
  };
  for (const child of children) {
    child.on("exit", () => {
      if (!stillRunning()) done();
    });
  }
  for (const child of children) {
    if (child.exitCode === null && child.signalCode == null) child.kill("SIGTERM");
  }
  if (!stillRunning()) done();
  const timer = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode == null) child.kill("SIGKILL");
    }
    setTimeout(done, 200);
  }, status === 0 ? 5000 : 2000);
  timer.unref();
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  finish(0);
}

function childStopped(code) {
  if (stopping) return;
  stopping = true;
  const status = typeof code === "number" && code !== 0 ? code : 1;
  finish(status);
}

function start(command, args) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
  children.push(child);
  child.on("error", () => childStopped(1));
  child.on("exit", (code) => childStopped(code));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

for (const [command, args] of parseCommands(process.argv)) {
  start(command, args);
}
