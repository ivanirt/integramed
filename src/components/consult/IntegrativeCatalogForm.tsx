"use client";

import { useMemo, useState } from "react";
import type { IntegrativeModality } from "@/lib/integrative";
import { saveIntegrativeCatalogAction } from "@/lib/actions";
import { Button, Input } from "@/components/ui";

function modalityIdFromLabel(label: string) {
  return (
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || `mod_${Date.now()}`
  );
}

export function IntegrativeCatalogForm({
  initial,
  fhirId,
}: {
  initial: IntegrativeModality[];
  fhirId?: string;
}) {
  const [items, setItems] = useState(initial);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const enabledCount = useMemo(() => items.filter((i) => i.enabled).length, [items]);

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-[#6D5E52]">
        {enabledCount} activas en consulta. El médico puede apagar una modalidad en esa visita sin
        cambiar el catálogo.
      </p>
      <ul className="divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
        {items.map((item, idx) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) =>
                setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, enabled: e.target.checked } : row)))
              }
            />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent"
              value={item.labelEs}
              onChange={(e) =>
                setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, labelEs: e.target.value } : row)))
              }
            />
            <span className="font-mono text-xs text-[#6D5E52]">{item.id}</span>
            <button
              type="button"
              className="text-xs text-[#6D5E52] underline"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = label.trim();
          if (!name) return;
          const id = modalityIdFromLabel(name);
          if (items.some((i) => i.id === id)) {
            setStatus("Ese identificador ya existe.");
            return;
          }
          setItems((prev) => [...prev, { id, labelEs: name, enabled: true }]);
          setLabel("");
        }}
      >
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nueva modalidad" />
        <Button type="submit">Añadir</Button>
      </form>
      <Button
        type="button"
        onClick={async () => {
          await saveIntegrativeCatalogAction(items, fhirId);
          setStatus("Catálogo guardado en FHIR (Basic).");
        }}
      >
        Guardar catálogo
      </Button>
      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}
