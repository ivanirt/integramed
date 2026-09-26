"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAppointmentAction, moveAppointmentAction, startConsultFromAppointment } from "@/lib/actions";
import {
  WEEKLY_TIME_SLOTS,
  formatDateKey,
  mondayOfWeek,
  statusTone,
  STATUS_LABEL,
  type AgendaItem,
} from "@/lib/agenda";
import { Button, Field, Input, Select } from "@/components/ui";

type Person = { id: string; name: string };

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function WeeklyAgenda({
  items,
  patients,
  staff,
  today,
}: {
  items: AgendaItem[];
  patients: Person[];
  staff: Person[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [anchor, setAnchor] = useState(() => new Date(`${today}T12:00:00`));
  const [filterPatient, setFilterPatient] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"week" | "list">("week");
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monday = useMemo(() => mondayOfWeek(anchor), [anchor]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = formatDateKey(date);
        return { dateStr, dayName: DAY_NAMES[i], dayNumber: date.getDate(), isToday: dateStr === today };
      }),
    [monday, today],
  );

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startDate = new Date(`${start.dateStr}T00:00:00`);
    const endDate = new Date(`${end.dateStr}T00:00:00`);
    const month = new Intl.DateTimeFormat("es-MX", { month: "long" }).format(endDate);
    const year = endDate.getFullYear();
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${start.dayNumber} al ${end.dayNumber} de ${month} de ${year}`;
    }
    const monthStart = new Intl.DateTimeFormat("es-MX", { month: "long" }).format(startDate);
    return `${start.dayNumber} de ${monthStart} al ${end.dayNumber} de ${month} de ${year}`;
  }, [weekDays]);

  const filtered = useMemo(() => {
    const p = filterPatient.trim().toLowerCase();
    const d = filterDoctor.trim().toLowerCase();
    const r = filterReason.trim().toLowerCase();
    return items.filter((item) => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (p && !item.patientName.toLowerCase().includes(p)) return false;
      if (d && !item.practitionerName.toLowerCase().includes(d) && item.practitionerId !== filterDoctor) return false;
      if (r && !item.reason.toLowerCase().includes(r)) return false;
      return true;
    });
  }, [items, filterPatient, filterDoctor, filterReason, filterStatus]);

  const bySlot = useMemo(() => {
    const map: Record<string, AgendaItem[]> = {};
    for (const item of filtered) {
      const key = `${item.date}-${item.time}`;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [filtered]);

  const weekCount = useMemo(() => {
    const dates = new Set(weekDays.map((d) => d.dateStr));
    return filtered.filter((item) => dates.has(item.date)).length;
  }, [filtered, weekDays]);

  const planned = items.filter((i) => i.status === "booked" || i.status === "pending" || i.status === "proposed").length;
  const waiting = items.filter((i) => i.status === "arrived" || i.status === "checkedin").length;
  const done = items.filter((i) => i.status === "fulfilled").length;

  const filtersOn = Boolean(filterPatient || filterDoctor || filterReason || filterStatus !== "all");

  async function openConsult(id: string) {
    setOpeningId(id);
    try {
      const { encounterId, patientId } = await startConsultFromAppointment(id);
      router.push(`/consulta/${encounterId}?paciente=${patientId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la consulta.");
    } finally {
      setOpeningId(null);
    }
  }

  async function dropOnSlot(date: string, time: string) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("id", id);
      data.set("start", `${date}T${time}`);
      data.set("minutes", "30");
      await moveAppointmentAction(data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Agenda</h1>
          <p className="mt-2 text-sm text-[#6D5E52]">
            Semana de lunes a domingo, huecos de 30 minutos de 08:00 a 22:00. Cada cita es un Appointment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`border px-3 py-1 ${view === "week" ? "border-[#241B16] bg-[#241B16] text-[#FAF7F2]" : "border-[#EADBCE]"}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`border px-3 py-1 ${view === "list" ? "border-[#241B16] bg-[#241B16] text-[#FAF7F2]" : "border-[#EADBCE]"}`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setSlot({ date: today, time: "09:00" })}
            className="border border-[#241B16] bg-[#241B16] px-3 py-1 text-[#FAF7F2]"
          >
            Nueva cita
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Citas" value={items.length} />
        <Stat label="Programadas" value={planned} />
        <Stat label="En espera" value={waiting} />
        <Stat label="Finalizadas" value={done} />
      </div>

      <div className="border border-[#EADBCE] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Filtros de agenda</p>
            <p className="text-xs text-[#6D5E52]">Paciente, profesional, motivo y estado</p>
          </div>
          {filtersOn ? (
            <button
              type="button"
              className="text-xs underline"
              onClick={() => {
                setFilterPatient("");
                setFilterDoctor("");
                setFilterReason("");
                setFilterStatus("all");
              }}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Paciente">
            <Input
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              placeholder="Nombre del paciente"
            />
          </Field>
          <Field label="Doctor / terapeuta">
            <Select value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}>
              <option value="">Todos</option>
              {staff.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Motivo">
            <Input
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              placeholder="Motivo o tipo"
            />
          </Field>
          <Field label="Estado">
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Todos</option>
              <option value="booked">Programada</option>
              <option value="arrived">En espera</option>
              <option value="fulfilled">Finalizada</option>
              <option value="cancelled">Cancelada</option>
            </Select>
          </Field>
        </div>
      </div>

      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {pending ? <p className="text-xs text-[#6D5E52]">Guardando en FHIR…</p> : null}

      {view === "list" ? (
        <ul className="divide-y divide-[#EADBCE] border border-[#EADBCE] bg-white">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-sm text-[#6D5E52]">No hay citas con esos filtros.</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p>
                    {item.date} {item.time} · {STATUS_LABEL[item.status] || item.status}
                  </p>
                  <p className="text-[#6D5E52]">
                    {item.patientName} · {item.practitionerName}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </p>
                </div>
                <div className="flex gap-3">
                  {item.patientId ? (
                    <Link href={`/pacientes/${item.patientId}`} className="underline">
                      Ficha
                    </Link>
                  ) : null}
                  <button type="button" className="underline" onClick={() => openConsult(item.id)}>
                    {openingId === item.id ? "Abriendo…" : "Abrir consulta"}
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      ) : (
        <div className="overflow-hidden border border-[#EADBCE] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EADBCE] px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="border border-[#EADBCE] px-2 py-1 text-sm"
                onClick={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}
              >
                ←
              </button>
              <button
                type="button"
                className="border border-[#EADBCE] px-2 py-1 text-sm"
                onClick={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}
              >
                →
              </button>
              <button type="button" className="border border-[#EADBCE] px-3 py-1 text-sm" onClick={() => setAnchor(new Date())}>
                Hoy
              </button>
              <h2 className="font-serif text-xl capitalize">{weekLabel}</h2>
            </div>
            <p className="text-xs text-[#6D5E52]">
              08:00 – 22:00 (30 min) · {weekCount} citas en la semana
            </p>
          </div>
          <div className="max-h-[750px] overflow-auto">
            <table className="w-full min-w-[980px] table-fixed border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                <tr>
                  <th className="w-[72px] border-b border-[#EADBCE] px-2 py-3 font-medium text-[#6D5E52]">Hora</th>
                  {weekDays.map((day) => (
                    <th
                      key={day.dateStr}
                      className={`border-b border-l border-[#EADBCE] px-2 py-2 ${day.isToday ? "bg-white" : ""}`}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-[#6D5E52]">{day.dayName}</div>
                      <div className={`mt-1 font-serif text-lg ${day.isToday ? "underline" : ""}`}>{day.dayNumber}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKLY_TIME_SLOTS.map((time) => (
                  <tr key={time}>
                    <td className="border-t border-[#EADBCE] px-2 py-0 text-right text-[#6D5E52]">{time}</td>
                    {weekDays.map((day) => {
                      const key = `${day.dateStr}-${time}`;
                      const cellItems = bySlot[key] || [];
                      return (
                        <td
                          key={key}
                          className="h-12 border-l border-t border-[#EADBCE] align-top"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => dropOnSlot(day.dateStr, time)}
                        >
                          {cellItems.length === 0 ? (
                            <button
                              type="button"
                              className="block h-12 w-full text-left text-[#EADBCE] hover:bg-white hover:text-[#6D5E52]"
                              title={`Agendar ${day.dateStr} ${time}`}
                              onClick={() => setSlot({ date: day.dateStr, time })}
                            >
                              <span className="px-2">+</span>
                            </button>
                          ) : (
                            <div className="flex flex-col gap-0.5 p-0.5">
                              {cellItems.map((item) => (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={() => setDragId(item.id)}
                                  className={`cursor-grab border px-1.5 py-1 ${statusTone(item.status)}`}
                                >
                                  <p className="truncate font-medium">{item.patientName}</p>
                                  <p className="truncate text-[10px] opacity-80">
                                    {item.practitionerName}
                                    {item.reason ? ` · ${item.reason}` : ""}
                                  </p>
                                  <div className="mt-0.5 flex gap-2">
                                    <button type="button" className="underline" onClick={() => openConsult(item.id)}>
                                      {openingId === item.id ? "…" : "Consulta"}
                                    </button>
                                    {item.patientId ? (
                                      <Link href={`/pacientes/${item.patientId}`} className="underline">
                                        Ficha
                                      </Link>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {slot ? (
        <ScheduleDialog
          slot={slot}
          patients={patients}
          staff={staff}
          onClose={() => setSlot(null)}
          onSaved={() => {
            setSlot(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#EADBCE] bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-[#6D5E52]">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </div>
  );
}

function ScheduleDialog({
  slot,
  patients,
  staff,
  onClose,
  onSaved,
}: {
  slot: { date: string; time: string };
  patients: Person[];
  staff: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = new FormData(event.currentTarget);
      data.set("start", `${slot.date}T${slot.time}`);
      data.set("minutes", "30");
      await createAppointmentAction(data);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#241B16]/40 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 border border-[#EADBCE] bg-[#FAF7F2] p-6">
        <h2 className="font-serif text-2xl">Nueva cita</h2>
        <p className="text-sm text-[#6D5E52]">
          {slot.date} · {slot.time} · 30 minutos
        </p>
        <Field label="Paciente">
          <Select name="patientId" required>
            <option value="">Selecciona</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Profesional">
          <Select name="practitionerId" required>
            <option value="">Selecciona</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Motivo">
          <Input name="reason" placeholder="Control, terapia, primera vez…" />
        </Field>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <button type="button" className="border border-[#EADBCE] px-4 py-2 text-sm" onClick={onClose}>
            Cancelar
          </button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Agendar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
