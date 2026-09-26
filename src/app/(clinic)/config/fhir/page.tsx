import { setFhirModeAction } from "@/lib/actions";
import { Button, Field, Input, Select } from "@/components/ui";

async function health() {
  const proxy = process.env.FHIR_PROXY_URL || "http://localhost:3001";
  const res = await fetch(`${proxy}/api/health`, { cache: "no-store" });
  return res.json();
}

export default async function FhirPage() {
  const info = await health().catch(() => ({ status: "unreachable", mode: "local" }));
  return (
    <div>
      <h2 className="font-serif text-2xl">Conexión FHIR</h2>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Estado: {info.status} · modo {info.mode} · pacientes {info.patientCount ?? "—"}
      </p>
      <form action={setFhirModeAction} className="mt-6 max-w-lg space-y-4">
        <Field label="Modo">
          <Select name="fhirMode" defaultValue={info.mode || "local"}>
            <option value="local">IntegraMed local FHIR R4</option>
            <option value="proxy">Proxy Medblocks</option>
          </Select>
        </Field>
        <Field label="Base URL remota">
          <Input name="fhirBaseUrl" defaultValue={info.serverUrl || ""} />
        </Field>
        <Field label="Token">
          <Input name="fhirAuthToken" type="password" />
        </Field>
        <Button type="submit">Aplicar</Button>
      </form>
    </div>
  );
}
