import { deleteLeaveAction, saveLeaveAction } from "@/lib/actions";
import { Button, Field, Input, Select } from "@/components/ui";

type LeaveRow = {
  id: string;
  practitioner: string;
  practitionerId?: string;
  start: string;
  end: string;
  reason: string;
};

type StaffOption = { id: string; name: string };

export function LeaveManager({
  practitionerId,
  staff,
  leaves,
  showPractitioner,
}: {
  practitionerId?: string;
  staff?: StaffOption[];
  leaves: LeaveRow[];
  showPractitioner?: boolean;
}) {
  return (
    <div>
      <form action={saveLeaveAction} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
        {practitionerId ? (
          <input type="hidden" name="practitionerId" value={practitionerId} />
        ) : (
          <Field label="Profesional">
            <Select name="practitionerId" required>
              {(staff || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Inicio">
          <Input type="date" name="start" required />
        </Field>
        <Field label="Fin">
          <Input type="date" name="end" required />
        </Field>
        <Field label="Motivo">
          <Input name="reason" required placeholder="Vacaciones, congreso…" />
        </Field>
        <div className="self-end">
          <Button type="submit">Registrar día libre</Button>
        </div>
      </form>
      <ul className="mt-6 space-y-2 text-sm">
        {leaves.length === 0 ? (
          <li className="border border-[#EADBCE] bg-white px-3 py-4 text-[#6D5E52]">Sin días libres registrados.</li>
        ) : (
          leaves.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 border border-[#EADBCE] bg-white px-3 py-2">
              <span>
                {showPractitioner ? `${l.practitioner} · ` : null}
                {l.start} – {l.end} · {l.reason}
              </span>
              <form
                action={async () => {
                  "use server";
                  await deleteLeaveAction(l.id, practitionerId || l.practitionerId || "");
                }}
              >
                <button type="submit" className="underline">
                  Quitar
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
