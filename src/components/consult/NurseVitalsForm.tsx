"use client";

import { useMemo, useState } from "react";
import { saveVitalsAction } from "@/lib/actions";
import { Button, Field, Input } from "@/components/ui";
import { VITAL_FIELDS, type VitalKey } from "@/lib/vitals";
import { useRouter } from "next/navigation";

const NURSE_KEYS: VitalKey[] = ["weight", "height", "sys", "dia", "hr", "temp", "rr", "spo2"];

export function NurseVitalsForm({
  encounterId,
  patientId,
  patientName,
  initial,
}: {
  encounterId: string;
  patientId: string;
  patientName: string;
  initial: Record<VitalKey, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bmi = useMemo(() => {
    const m = Number(values.height) / 100;
    const kg = Number(values.weight);
    if (!m || !kg || m <= 0) return "";
    return String(Math.round((kg / (m * m)) * 10) / 10);
  }, [values.height, values.weight]);

  async function submit(handoff: boolean) {
    setBusy(true);
    setError(null);
    const data = new FormData();
    data.set("encounterId", encounterId);
    data.set("patientId", patientId);
    data.set("handoff", handoff ? "1" : "0");
    for (const key of NURSE_KEYS) data.set(key, values[key] || "");
    if (bmi) data.set("bmi", bmi);
    try {
      await saveVitalsAction(data);
      if (handoff) router.push("/agenda");
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los signos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Enfermería · triaje</p>
      <h1 className="mt-2 font-serif text-4xl">Signos y peso</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">{patientName}. El médico entra cuando este paso está listo.</p>
      <form
        className="mt-8 grid gap-4 border border-[#EADBCE] bg-white p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(true);
        }}
      >
        {NURSE_KEYS.map((key) => {
          const field = VITAL_FIELDS.find((f) => f.key === key)!;
          return (
            <Field key={key} label={field.label}>
              <Input
                inputMode="decimal"
                value={values[key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </Field>
          );
        })}
        <div className="sm:col-span-2 text-sm text-[#6D5E52]">IMC calculado: {bmi || "—"}</div>
        {error ? <p className="sm:col-span-2 text-sm text-red-800">{error}</p> : null}
        <div className="sm:col-span-2 flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            Guardar y pasar al médico
          </Button>
          <button
            type="button"
            disabled={busy}
            className="border border-[#EADBCE] px-4 py-2 text-sm"
            onClick={() => void submit(false)}
          >
            Guardar sin pasar
          </button>
        </div>
      </form>
    </div>
  );
}
