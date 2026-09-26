"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  beginDoctorConsultAction,
  finalizeConsultAction,
  saveSoapAction,
} from "@/lib/actions";
import { DictationButton } from "@/components/consult/DictationButton";
import type { IntegrativeModality } from "@/lib/integrative";
import type { HistoryNote } from "@/lib/vitals";
import { VITAL_FIELDS, type VitalKey } from "@/lib/vitals";
import { searchCie, type CieTerm } from "@/lib/cie10";

type Diagnosis = { code?: string; label: string };
type SoapField = "subjective" | "objective" | "assessment" | "plan";

type PatientCard = {
  id: string;
  name: string;
  birthDate?: string;
  gender?: string;
};

export type ConsultWorkspaceProps = {
  encounterId: string;
  patient: PatientCard;
  encounterStatus: string;
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  diagnoses: Diagnosis[];
  vitals: Record<VitalKey, string>;
  history: HistoryNote[];
  catalog: IntegrativeModality[];
  activeModalities: string[];
  role: string;
};

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function ageFrom(birth?: string) {
  if (!birth) return "";
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return `${age} a`;
}

function genderLabel(g?: string) {
  if (g === "female") return "Mujer";
  if (g === "male") return "Hombre";
  return g || "";
}

export function ConsultWorkspace(props: ConsultWorkspaceProps) {
  const router = useRouter();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [subjective, setSubjective] = useState(props.soap.subjective);
  const [objective, setObjective] = useState(props.soap.objective);
  const [assessment, setAssessment] = useState(props.soap.assessment);
  const [plan, setPlan] = useState(props.soap.plan);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(props.diagnoses);
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [cieHits, setCieHits] = useState<CieTerm[]>([]);
  const [openNote, setOpenNote] = useState<HistoryNote | null>(null);
  const [modalities, setModalities] = useState<string[]>(
    props.activeModalities.length
      ? props.activeModalities
      : props.catalog.filter((m) => m.enabled).map((m) => m.id),
  );
  const [dictating, setDictating] = useState<SoapField | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const [aiKind, setAiKind] = useState<"dx" | "tx" | null>(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (props.encounterStatus === "triaged" || props.encounterStatus === "arrived") {
      void beginDoctorConsultAction(props.encounterId);
    }
  }, [props.encounterId, props.encounterStatus]);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function stopDictation() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setDictating(null);
  }

  function toggleDictation(field: SoapField) {
    const Speech =
      typeof window !== "undefined"
        ? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec })
            .webkitSpeechRecognition ||
          (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition
        : undefined;
    if (!Speech) {
      setStatus("Este navegador no permite dictado.");
      return;
    }
    if (dictating === field) {
      stopDictation();
      return;
    }
    stopDictation();
    const rec = new Speech();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      let chunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const row = ev.results[i];
        if (row.isFinal) chunk += row[0].transcript;
      }
      const text = chunk.trim();
      if (!text) return;
      const apply = {
        subjective: setSubjective,
        objective: setObjective,
        assessment: setAssessment,
        plan: setPlan,
      }[field];
      apply((prev) => `${prev ? `${prev.trim()} ` : ""}${text}`);
    };
    rec.onend = () => setDictating(null);
    rec.onerror = () => setDictating(null);
    recRef.current = rec;
    rec.start();
    setDictating(field);
  }

  useEffect(() => {
    const q = diagnosisInput.trim();
    if (q.length < 2) {
      setCieHits([]);
      return;
    }
    setCieHits(searchCie(q, 8));
  }, [diagnosisInput]);

  function addDx(item: Diagnosis) {
    const key = item.code || item.label;
    if (diagnoses.some((d) => (d.code || d.label) === key)) return;
    setDiagnoses((prev) => [...prev, item]);
    setDiagnosisInput("");
    setCieHits([]);
  }

  function formData() {
    const data = new FormData();
    data.set("encounterId", props.encounterId);
    data.set("patientId", props.patient.id);
    data.set("subjective", subjective);
    data.set("objective", objective);
    data.set("assessment", assessment);
    data.set("plan", plan);
    data.set("diagnoses", JSON.stringify(diagnoses));
    data.set("modalities", JSON.stringify(modalities));
    return data;
  }

  async function save(kind: "draft" | "final") {
    setBusy(true);
    setStatus(null);
    try {
      if (kind === "final") await finalizeConsultAction(formData());
      else await saveSoapAction(formData());
      setStatus(kind === "final" ? "Consulta cerrada." : "Borrador guardado.");
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const modalitySpecs = useMemo(
    () =>
      props.catalog
        .filter((m) => modalities.includes(m.id))
        .map((m) => ({ id: m.id, label: m.labelEs })),
    [modalities, props.catalog],
  );

  async function askAi(kind: "dx" | "tx") {
    if (!diagnoses.length && !assessment.trim()) {
      setAiError("Indica un código CIE o un texto de valoración.");
      setAiKind(kind);
      return;
    }
    setAiKind(kind);
    setAiBusy(true);
    setAiError(null);
    setAiAnswer("");
    const question =
      kind === "dx"
        ? "Con el SOAP y los códigos, sugiere diagnósticos diferenciales y cómo confirmarlos. No sustituyas el criterio clínico."
        : "Con las modalidades integrativas activas, sugiere un abordaje de tratamiento. No es una orden médica.";
    try {
      const res = await fetch("/api/ai/clinical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: diagnoses,
          diagnosisFreeText: [assessment, subjective, objective].filter(Boolean).join("\n"),
          modalities: modalitySpecs,
          question,
          language: "es",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "IA no disponible");
      setAiAnswer(data.answer || "");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "IA no disponible");
    } finally {
      setAiBusy(false);
    }
  }

  const vitalLine = VITAL_FIELDS.filter((f) => props.vitals[f.key])
    .map((f) => `${f.label.replace(/ \(.*\)/, "")} ${props.vitals[f.key]}`)
    .join(" · ");

  return (
    <div className="flex min-h-screen">
      <aside
        className={`shrink-0 border-r border-[#EADBCE] bg-white transition-[width] ${leftOpen ? "w-72" : "w-10"}`}
      >
        {leftOpen ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-[#EADBCE] px-3 py-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Paciente</p>
                <h2 className="mt-1 font-serif text-xl leading-tight">{props.patient.name}</h2>
                <p className="mt-1 text-xs text-[#6D5E52]">
                  {[genderLabel(props.patient.gender), ageFrom(props.patient.birthDate)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" className="text-xs text-[#6D5E52]" onClick={() => setLeftOpen(false)} title="Ocultar">
                ⟨
              </button>
            </div>
            <div className="border-b border-[#EADBCE] px-3 py-3 text-xs text-[#6D5E52]">
              <p className="font-medium text-[#241B16]">Signos de triaje</p>
              <p className="mt-1 leading-relaxed">{vitalLine || "Sin signos en este encuentro."}</p>
            </div>
            <div className="flex-1 overflow-auto px-3 py-3">
              <p className="text-xs font-medium text-[#241B16]">Historia</p>
              {props.history.length === 0 ? (
                <p className="mt-2 text-xs text-[#6D5E52]">Sin notas previas.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {props.history.map((note) => (
                    <li key={note.encounterId}>
                      <button
                        type="button"
                        onClick={() => setOpenNote(openNote?.encounterId === note.encounterId ? null : note)}
                        className="w-full text-left text-xs text-[#6D5E52] hover:text-[#241B16]"
                      >
                        {note.date.slice(0, 10)} · {note.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {openNote ? (
                <div className="mt-3 space-y-2 border border-[#EADBCE] p-2 text-xs leading-relaxed text-[#6D5E52]">
                  {openNote.diagnoses.length ? (
                    <p>{openNote.diagnoses.map((d) => d.code || d.label).join(", ")}</p>
                  ) : null}
                  {openNote.subjective ? <p>S: {openNote.subjective.slice(0, 280)}</p> : null}
                  {openNote.assessment ? <p>A: {openNote.assessment.slice(0, 280)}</p> : null}
                  {openNote.plan ? <p>P: {openNote.plan.slice(0, 280)}</p> : null}
                </div>
              ) : null}
            </div>
            <div className="border-t border-[#EADBCE] px-3 py-3 text-xs">
              <Link href={`/pacientes/${props.patient.id}`} className="underline">
                Ficha
              </Link>
              <span className="mx-2 text-[#EADBCE]">·</span>
              <Link href="/agenda" className="underline">
                Agenda
              </Link>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex h-full w-full items-start justify-center py-4 text-xs text-[#6D5E52]"
            onClick={() => setLeftOpen(true)}
            title="Paciente e historia"
          >
            ⟩
          </button>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#EADBCE] px-5 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Consulta</p>
            <h1 className="font-serif text-2xl">Nota SOAP</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("draft")}
              className="border border-[#EADBCE] px-3 py-1.5 text-sm"
            >
              Guardar
            </button>
            <Link
              href={`/pacientes/${props.patient.id}/recetas`}
              className="border border-[#EADBCE] px-3 py-1.5 text-sm"
            >
              Receta
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("final")}
              className="border border-[#241B16] bg-[#241B16] px-3 py-1.5 text-sm text-[#FAF7F2]"
            >
              Cerrar consulta
            </button>
          </div>
        </header>
        <div className="flex-1 space-y-5 overflow-auto px-5 py-5">
          <SoapBlock
            title="S · Subjetivo"
            value={subjective}
            onChange={setSubjective}
            dictating={dictating === "subjective"}
            onMic={() => toggleDictation("subjective")}
            rows={5}
            placeholder="Motivo de consulta, síntomas, contexto..."
          />
          <SoapBlock
            title="O · Objetivo"
            value={objective}
            onChange={setObjective}
            dictating={dictating === "objective"}
            onMic={() => toggleDictation("objective")}
            rows={4}
            placeholder="Exploración. Los signos de triaje están a la izquierda."
          />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-[#6D5E52]">A · Valoración</label>
              <DictationButton
                active={dictating === "assessment"}
                onClick={() => toggleDictation("assessment")}
                title="Dictar valoración"
              />
            </div>
            <div className="relative flex min-h-12 flex-wrap items-center gap-2 border border-[#EADBCE] bg-white px-3 py-2">
              {diagnoses.map((dx, idx) => (
                <span
                  key={`${dx.code}-${dx.label}-${idx}`}
                  className="inline-flex items-center gap-1 border border-[#EADBCE] bg-[#FAF7F2] px-2 py-0.5 text-xs"
                >
                  {dx.code ? <span className="font-mono">{dx.code}</span> : null}
                  {dx.label}
                  <button
                    type="button"
                    onClick={() => setDiagnoses((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Quitar"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (cieHits[0]) addDx(cieHits[0]);
                    else if (diagnosisInput.trim()) addDx({ label: diagnosisInput.trim() });
                  }
                }}
                placeholder="Buscar CIE-10 o texto libre"
                className="min-w-[160px] flex-1 border-0 bg-transparent text-sm outline-none"
              />
            </div>
            {cieHits.length ? (
              <ul className="mt-1 border border-[#EADBCE] bg-white text-sm">
                {cieHits.map((hit) => (
                  <li key={hit.code}>
                    <button
                      type="button"
                      className="flex w-full gap-2 px-3 py-1.5 text-left hover:bg-[#FAF7F2]"
                      onClick={() => addDx(hit)}
                    >
                      <span className="font-mono text-xs">{hit.code}</span>
                      <span>{hit.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <textarea
              className="mt-2 w-full border border-[#EADBCE] bg-white px-3 py-2 text-sm"
              rows={3}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              placeholder="Impresión diagnóstica en texto libre"
            />
          </div>
          <SoapBlock
            title="P · Plan"
            value={plan}
            onChange={setPlan}
            dictating={dictating === "plan"}
            onMic={() => toggleDictation("plan")}
            rows={5}
            placeholder="Tratamiento, estudios, seguimiento..."
          />
          {status ? <p className="text-sm text-[#6D5E52]">{status}</p> : null}
        </div>
      </section>

      <aside
        className={`shrink-0 border-l border-[#EADBCE] bg-white transition-[width] ${rightOpen ? "w-80" : "w-10"}`}
      >
        {rightOpen ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[#EADBCE] px-3 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6D5E52]">Integrativa</p>
                <h2 className="font-serif text-lg">Modalidades e IA</h2>
              </div>
              <button type="button" className="text-xs text-[#6D5E52]" onClick={() => setRightOpen(false)}>
                ⟩
              </button>
            </div>
            <div className="flex-1 overflow-auto px-3 py-3">
              <p className="text-xs text-[#6D5E52]">Activas para esta visita. El catálogo se edita en Configuración.</p>
              <ul className="mt-3 space-y-2">
                {props.catalog.map((item) => (
                  <li key={item.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={modalities.includes(item.id)}
                        onChange={(e) =>
                          setModalities((prev) =>
                            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <span className={!item.enabled ? "text-[#6D5E52]" : ""}>{item.labelEs}</span>
                      {!item.enabled ? <span className="text-[10px] uppercase text-[#6D5E52]">catálogo</span> : null}
                    </label>
                  </li>
                ))}
              </ul>
              {props.role === "admin" ? (
                <Link href="/config/integrativa" className="mt-3 inline-block text-xs underline">
                  Editar catálogo
                </Link>
              ) : null}
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => void askAi("dx")}
                  className="w-full border border-[#EADBCE] px-3 py-2 text-left text-sm"
                >
                  IA · diagnóstico
                </button>
                <button
                  type="button"
                  onClick={() => void askAi("tx")}
                  className="w-full border border-[#EADBCE] px-3 py-2 text-left text-sm"
                >
                  IA · tratamiento
                </button>
              </div>
              {aiKind ? (
                <div className="mt-4 border border-[#EADBCE] p-3 text-xs leading-relaxed text-[#6D5E52]">
                  <p className="font-medium text-[#241B16]">
                    {aiKind === "dx" ? "Apoyo diagnóstico" : "Apoyo de tratamiento"}
                  </p>
                  {aiBusy ? <p className="mt-2">Consultando bóveda…</p> : null}
                  {aiError ? <p className="mt-2">{aiError}</p> : null}
                  {aiAnswer ? <p className="mt-2 whitespace-pre-wrap">{aiAnswer}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex h-full w-full items-start justify-center py-4 text-xs text-[#6D5E52]"
            onClick={() => setRightOpen(true)}
            title="Medicina integrativa"
          >
            ⟨
          </button>
        )}
      </aside>
    </div>
  );
}

function SoapBlock({
  title,
  value,
  onChange,
  dictating,
  onMic,
  rows,
  placeholder,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  dictating: boolean;
  onMic: () => void;
  rows: number;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-[#6D5E52]">{title}</label>
        <DictationButton active={dictating} onClick={onMic} />
      </div>
      <textarea
        className="w-full border border-[#EADBCE] bg-white px-3 py-2 text-sm leading-relaxed"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
