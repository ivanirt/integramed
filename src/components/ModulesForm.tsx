"use client";

import { useState } from "react";
import { saveModulesAction } from "@/lib/actions";
import { Button } from "@/components/ui";

const LABELS: Record<string, string> = {
  home: "Inicio",
  agenda: "Agenda",
  patients: "Pacientes",
  farmacia: "Farmacia",
  personal: "Personal",
  boveda: "Bóveda",
};

export function ModulesForm({ initial, fhirId }: { initial: Record<string, boolean>; fhirId?: string }) {
  const [modules, setModules] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await saveModulesAction(modules, fhirId);
        setStatus("Módulos guardados en Basic.");
      }}
      className="space-y-3"
    >
      {Object.keys(LABELS).map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={modules[key] !== false}
            onChange={(e) => setModules({ ...modules, [key]: e.target.checked })}
          />
          {LABELS[key]}
        </label>
      ))}
      {status ? <p className="text-sm">{status}</p> : null}
      <Button type="submit">Guardar módulos</Button>
    </form>
  );
}
