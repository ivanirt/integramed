import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { seedTestUsers } from "./qa-users.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

function usage(): never {
  console.error("Uso: npm run seed:test-users [-- --rotate]");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  if (args.some((arg) => arg !== "--rotate")) usage();
  const { resolvedFhirMode } = await import("../src/lib/fhir-mode.js");
  const mode = resolvedFhirMode(process.env, "local");
  if (mode !== "local") {
    console.warn(
      `[seed:test-users] FHIR_MODE=${mode}. Este comando solo escribe el almacén local data/fhir.`,
    );
  }
  const result = await seedTestUsers(root, { rotate: args.includes("--rotate") });
  console.log(`Usuarios de prueba: ${result.count}`);
  for (const line of result.lines) console.log(line);
  console.log(`Contraseñas: ${result.file}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
