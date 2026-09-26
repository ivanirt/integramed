import { displayName, type FhirResource } from "./fhir";

export type AgendaItem = {
  id: string;
  date: string;
  time: string;
  patientId: string;
  patientName: string;
  practitionerId: string;
  practitionerName: string;
  reason: string;
  status: string;
};

export const WEEKLY_TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 22; hour += 1) {
    const hh = String(hour).padStart(2, "0");
    slots.push(`${hh}:00`);
    if (hour < 22) slots.push(`${hh}:30`);
  }
  return slots;
})();

export function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Local wall-clock FHIR dateTime (HAPI rejects hh:mm without seconds). */
export function toFhirDateTime(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(0, 19);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha u hora inválida.");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function addMinutesToFhirDateTime(value: string, minutes: number) {
  const start = toFhirDateTime(value);
  const [date, time] = start.split("T");
  const [h, m, s] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m + minutes, s || 0, 0);
  return toFhirDateTime(
    `${formatDateKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
  );
}

export function mondayOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function snapTime(hours: number, minutes: number) {
  const snappedMinute = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
  const snappedHour = minutes >= 45 ? hours + 1 : hours;
  return `${String(snappedHour).padStart(2, "0")}:${String(snappedMinute).padStart(2, "0")}`;
}

function participant(
  resource: FhirResource,
  prefix: "Patient/" | "Practitioner/",
) {
  const parts = (resource.participant as { actor?: { reference?: string; display?: string } }[]) || [];
  const match = parts.find((p) => p.actor?.reference?.startsWith(prefix));
  const reference = match?.actor?.reference || "";
  return {
    id: reference.replace(prefix, ""),
    name: match?.actor?.display || "",
  };
}

export function mapAppointment(resource: FhirResource): AgendaItem | null {
  if (!resource.id) return null;
  const start = String(resource.start || (resource.period as { start?: string } | undefined)?.start || "");
  const date = start.includes("T") ? start.slice(0, 10) : start.slice(0, 10);
  let time = "09:00";
  if (start.includes("T")) {
    const [h, m] = start.split("T")[1].split(":").map(Number);
    time = snapTime(h || 8, m || 0);
  }
  const patient = participant(resource, "Patient/");
  const practitioner = participant(resource, "Practitioner/");
  const reason =
    String(resource.description || "") ||
    ((resource.reasonCode as { text?: string }[] | undefined)?.[0]?.text || "");
  return {
    id: resource.id,
    date,
    time,
    patientId: patient.id,
    patientName: patient.name || displayName(resource),
    practitionerId: practitioner.id,
    practitionerName: practitioner.name,
    reason,
    status: String(resource.status || "booked"),
  };
}

export const STATUS_LABEL: Record<string, string> = {
  booked: "Programada",
  pending: "Pendiente",
  proposed: "Propuesta",
  arrived: "En espera",
  checkedin: "En espera",
  fulfilled: "Finalizada",
  cancelled: "Cancelada",
  noshow: "No asistió",
  "in-progress": "En consulta",
};

export function statusTone(status: string) {
  if (status === "arrived" || status === "checkedin") return "border-[#EADBCE] bg-[#FAF7F2] text-[#6D5E52]";
  if (status === "fulfilled") return "border-[#EADBCE] bg-white text-[#6D5E52]";
  if (status === "cancelled" || status === "noshow") return "border-red-200 bg-red-50 text-red-900";
  if (status === "in-progress") return "border-[#241B16] bg-[#241B16] text-[#FAF7F2]";
  return "border-[#EADBCE] bg-white text-[#241B16]";
}
