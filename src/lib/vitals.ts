import type { FhirResource } from "./fhir";

export type VitalKey = "hr" | "temp" | "rr" | "spo2" | "height" | "weight" | "bmi" | "sys" | "dia";

export const VITAL_FIELDS: { key: VitalKey; code: string; display: string; unit: string; label: string }[] = [
  { key: "hr", code: "8867-4", display: "Heart rate", unit: "beats/min", label: "FC (lpm)" },
  { key: "temp", code: "8310-5", display: "Body temperature", unit: "Cel", label: "Temp (°C)" },
  { key: "rr", code: "9279-1", display: "Respiratory rate", unit: "breaths/min", label: "FR" },
  { key: "spo2", code: "59408-5", display: "Oxygen saturation", unit: "%", label: "SpO2 (%)" },
  { key: "sys", code: "8480-6", display: "Systolic blood pressure", unit: "mmHg", label: "TAS (mmHg)" },
  { key: "dia", code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg", label: "TAD (mmHg)" },
  { key: "height", code: "8302-2", display: "Body height", unit: "cm", label: "Talla (cm)" },
  { key: "weight", code: "29463-7", display: "Body weight", unit: "kg", label: "Peso (kg)" },
  { key: "bmi", code: "39156-5", display: "Body mass index", unit: "kg/m2", label: "IMC" },
];

function loinc(obs: FhirResource) {
  const coding = (obs.code as { coding?: { code?: string }[] } | undefined)?.coding || [];
  return coding[0]?.code || "";
}

function qty(obs: FhirResource) {
  const q = obs.valueQuantity as { value?: number } | undefined;
  return q?.value == null ? "" : String(q.value);
}

export function latestVitals(observations: FhirResource[], encounterId?: string): Record<VitalKey, string> {
  const empty = Object.fromEntries(VITAL_FIELDS.map((f) => [f.key, ""])) as Record<VitalKey, string>;
  const scoped = encounterId
    ? observations.filter((o) => (o.encounter as { reference?: string } | undefined)?.reference === `Encounter/${encounterId}`)
    : observations;
  const byTime = [...scoped].sort((a, b) => String(b.effectiveDateTime || "").localeCompare(String(a.effectiveDateTime || "")));
  for (const field of VITAL_FIELDS) {
    const match = byTime.find((o) => loinc(o) === field.code);
    if (match) empty[field.key] = qty(match);
  }
  return empty;
}

export function hasEncounterVitals(observations: FhirResource[], encounterId: string) {
  const v = latestVitals(observations, encounterId);
  return Boolean(v.weight || v.hr || v.temp || v.sys || v.height);
}

export type HistoryNote = {
  encounterId: string;
  date: string;
  title: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses: { code?: string; label: string }[];
};
