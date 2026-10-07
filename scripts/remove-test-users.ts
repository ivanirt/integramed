import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeTestUsers } from "./qa-users.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(): never {
  console.error("Uso: npm run remove-test-users");
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  if (args.length) usage();
  const result = removeTestUsers(root);
  if (!result.removed) {
    console.log("No había usuarios de prueba.");
    return;
  }
  console.log(`Usuarios de prueba eliminados: ${result.removed}`);
  for (const line of result.lines) console.log(line);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
