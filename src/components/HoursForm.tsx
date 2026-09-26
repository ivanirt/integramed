"use client";

import { useState } from "react";
import { saveHoursAction, savePractitionerHoursAction } from "@/lib/actions";
import type { ClinicHours } from "@/lib/clinic-config";
import { DAY_NAMES } from "@/lib/roles";
import { Button, Input } from "@/components/ui";

export function HoursForm({
  initial,
  fhirId,
  practitionerId,
}: {
  initial: ClinicHours;
  fhirId?: string;
  practitionerId?: string;
}) {
  const [hours, setHours] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (practitionerId) await savePractitionerHoursAction(hours, practitionerId, fhirId);
        else await saveHoursAction(hours, fhirId);
        setStatus("Horario guardado en Schedule.");
      }}
    >
      <label className="block text-sm">
        Duración del hueco (min)
        <Input
          type="number"
          className="mt-1 max-w-xs"
          value={hours.slotDurationMinutes}
          onChange={(e) => setHours({ ...hours, slotDurationMinutes: Number(e.target.value) })}
        />
      </label>
      <table className="w-full border border-[#EADBCE] bg-white text-sm">
        <thead>
          <tr className="text-left text-[#6D5E52]">
            <th className="px-3 py-2">Día</th>
            <th className="px-3 py-2">Abierto</th>
            <th className="px-3 py-2">Inicio</th>
            <th className="px-3 py-2">Fin</th>
          </tr>
        </thead>
        <tbody>
          {DAY_NAMES.map((name, index) => {
            const day = hours.days[index] || { enabled: false, start: "09:00", end: "13:00" };
            return (
              <tr key={name} className="border-t border-[#EADBCE]">
                <td className="px-3 py-2">{name}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) =>
                      setHours({
                        ...hours,
                        days: { ...hours.days, [index]: { ...day, enabled: e.target.checked } },
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) =>
                      setHours({ ...hours, days: { ...hours.days, [index]: { ...day, start: e.target.value } } })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) =>
                      setHours({ ...hours, days: { ...hours.days, [index]: { ...day, end: e.target.value } } })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {status ? <p className="text-sm">{status}</p> : null}
      <Button type="submit">{practitionerId ? "Guardar horario de consulta" : "Guardar jornada de clínica"}</Button>
    </form>
  );
}
