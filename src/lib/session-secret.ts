import { isAcceptableSecret } from "./session-edge";

const SECRET_HINT = "Generate one with: openssl rand -base64 48";

export function assertRuntimeSecrets(): void {
  if (!isAcceptableSecret(process.env.SESSION_SECRET)) {
    throw new Error(
      `SESSION_SECRET must be set to a unique value of at least 32 characters. ${SECRET_HINT}`,
    );
  }
  if (!isAcceptableSecret(process.env.FHIR_PROXY_SECRET)) {
    throw new Error(
      `FHIR_PROXY_SECRET must be set to a unique value of at least 32 characters. ${SECRET_HINT}`,
    );
  }
}
