import fs from "node:fs";
import path from "node:path";

/**
 * Try to create `root` and write a probe file. `exists` is true only when
 * the path was already a directory, which selects the migrated-volume hint.
 * @returns {{ ok: true, dir: string, exists: boolean } | { ok: false, dir: string, exists: boolean }}
 */
export function probeWritable(root) {
  const dir = path.resolve(root);
  let exists = false;
  try {
    exists = fs.statSync(dir).isDirectory();
  } catch {
    exists = false;
  }
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, "ok", { encoding: "utf8", mode: 0o600 });
    fs.rmSync(probe, { force: true });
    return { ok: true, dir, exists };
  } catch {
    return { ok: false, dir, exists };
  }
}
