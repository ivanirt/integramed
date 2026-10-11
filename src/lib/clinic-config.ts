import { fhirCreate, fhirSearch, fhirUpdate, readExtension, withExtension, SYSTEMS, type FhirResource } from "./fhir";
import { DEFAULT_MODALITIES, loadIntegrativeCatalog } from "./integrative";
import { resolveIridologyAccess } from "./iridology-access";
import { DAY_NAMES, DEFAULT_MODULES } from "./roles";

export type DayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type ClinicHours = {
  slotDurationMinutes: number;
  days: Record<number, DayHours>;
};

export const DEFAULT_HOURS: ClinicHours = {
  slotDurationMinutes: 30,
  days: {
    1: { enabled: true, start: "08:00", end: "18:00" },
    2: { enabled: true, start: "08:00", end: "18:00" },
    3: { enabled: true, start: "08:00", end: "18:00" },
    4: { enabled: true, start: "08:00", end: "18:00" },
    5: { enabled: true, start: "08:00", end: "18:00" },
    6: { enabled: true, start: "09:00", end: "14:00" },
    0: { enabled: false, start: "09:00", end: "13:00" },
  },
};

function findByIdentifier(list: FhirResource[], system: string, value?: string) {
  return list.find((r) => {
    const ids = (r.identifier as { system?: string; value?: string }[]) || [];
    return ids.some((i) => i.system === system && (!value || i.value === value));
  });
}

export async function loadModules(): Promise<{ id?: string; modules: Record<string, boolean> }> {
  const basics = await fhirSearch("Basic");
  const match = basics.find((b) => {
    const ids = (b.identifier as { system?: string; value?: string }[]) || [];
    return ids.some((i) => i.system === SYSTEMS.moduleConfig);
  });
  if (!match) return { modules: { ...DEFAULT_MODULES } };
  const payload = readExtension(match, SYSTEMS.payload) as Record<string, boolean> | null;
  return { id: match.id, modules: { ...DEFAULT_MODULES, ...(payload || {}) } };
}

/** Module flags for nav and requireScreen. The iris screen reads `iridology`, not `iris`. */
export async function loadAccessModules(): Promise<Record<string, boolean>> {
  const { modules } = await loadModules();
  let modalities = DEFAULT_MODALITIES.map((item) => ({ ...item }));
  try {
    modalities = (await loadIntegrativeCatalog()).items;
  } catch {
    modalities = DEFAULT_MODALITIES.map((item) => ({ ...item }));
  }
  const access = resolveIridologyAccess(modules, modalities);
  const next: Record<string, boolean> = { ...modules, iridology: access.enabled };
  delete next.iris;
  return next;
}

export async function saveModules(modules: Record<string, boolean>, id?: string) {
  const resource = withExtension(
    {
      resourceType: "Basic",
      ...(id ? { id } : {}),
      code: { coding: [{ system: SYSTEMS.moduleConfig, code: "clinic-modules" }] },
      identifier: [{ system: SYSTEMS.moduleConfig, value: "clinic-modules" }],
    },
    SYSTEMS.payload,
    modules,
  );
  return id ? fhirUpdate(resource) : fhirCreate(resource);
}

export async function loadHours(): Promise<{ id?: string; hours: ClinicHours }> {
  const schedules = await fhirSearch("Schedule");
  const match = findByIdentifier(schedules, SYSTEMS.clinicHours, "clinic");
  if (!match) return { hours: DEFAULT_HOURS };
  const hours = (readExtension(match, SYSTEMS.hoursExtension) as ClinicHours) || DEFAULT_HOURS;
  return { id: match.id, hours };
}

export async function saveHours(hours: ClinicHours, id?: string) {
  const resource = withExtension(
    {
      resourceType: "Schedule",
      ...(id ? { id } : {}),
      active: true,
      identifier: [{ system: SYSTEMS.clinicHours, value: "clinic" }],
      actor: [{ display: "Clínica" }],
      comment: `Jornada ${hours.slotDurationMinutes} min`,
    },
    SYSTEMS.hoursExtension,
    hours,
  );
  return id ? fhirUpdate(resource) : fhirCreate(resource);
}

export async function loadPractitionerHours(practitionerId: string): Promise<{ id?: string; hours: ClinicHours }> {
  const schedules = await fhirSearch("Schedule");
  const match = findByIdentifier(schedules, SYSTEMS.practitionerHours, practitionerId);
  if (!match) {
    const clinic = await loadHours();
    return { hours: clinic.hours };
  }
  const hours = (readExtension(match, SYSTEMS.hoursExtension) as ClinicHours) || DEFAULT_HOURS;
  return { id: match.id, hours };
}

export async function savePractitionerHours(input: {
  practitionerId: string;
  practitionerName: string;
  hours: ClinicHours;
  id?: string;
}) {
  const resource = withExtension(
    {
      resourceType: "Schedule",
      ...(input.id ? { id: input.id } : {}),
      active: true,
      identifier: [{ system: SYSTEMS.practitionerHours, value: input.practitionerId }],
      actor: [{ reference: `Practitioner/${input.practitionerId}`, display: input.practitionerName }],
      comment: `Consulta ${input.hours.slotDurationMinutes} min`,
    },
    SYSTEMS.hoursExtension,
    input.hours,
  );
  return input.id ? fhirUpdate(resource) : fhirCreate(resource);
}

export async function listPractitionerHours() {
  const schedules = await fhirSearch("Schedule");
  return schedules
    .filter((s) => ((s.identifier as { system?: string }[]) || []).some((i) => i.system === SYSTEMS.practitionerHours))
    .map((s) => {
      const ids = (s.identifier as { system?: string; value?: string }[]) || [];
      const practitionerId = ids.find((i) => i.system === SYSTEMS.practitionerHours)?.value || "";
      const actor = (s.actor as { reference?: string; display?: string }[])?.[0];
      return {
        id: s.id || "",
        practitionerId,
        name: actor?.display || practitionerId,
        hours: (readExtension(s, SYSTEMS.hoursExtension) as ClinicHours) || DEFAULT_HOURS,
      };
    });
}

export function hoursSummary(hours: ClinicHours) {
  return DAY_NAMES.map((name, index) => {
    const day = hours.days[index];
    if (!day?.enabled) return null;
    return `${name.slice(0, 3)} ${day.start}–${day.end}`;
  })
    .filter(Boolean)
    .join(" · ");
}

export async function listHolidays() {
  const schedules = await fhirSearch("Schedule");
  return schedules
    .filter((s) => ((s.identifier as { system?: string }[]) || []).some((i) => i.system === SYSTEMS.holiday))
    .map((s) => ({
      id: s.id || "",
      date: (s.planningHorizon as { start?: string })?.start?.slice(0, 10) || "",
      name: String(s.comment || "Festivo"),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveHoliday(date: string, name: string, id?: string) {
  const resource: FhirResource = {
    resourceType: "Schedule",
    ...(id ? { id } : {}),
    active: false,
    identifier: [{ system: SYSTEMS.holiday, value: date }],
    actor: [{ display: "Clínica" }],
    planningHorizon: { start: date, end: date },
    comment: name,
  };
  return id ? fhirUpdate(resource) : fhirCreate(resource);
}

export async function listLeaves(practitionerId?: string) {
  const schedules = await fhirSearch("Schedule");
  return schedules
    .filter((s) => ((s.identifier as { system?: string }[]) || []).some((i) => i.system === SYSTEMS.leave))
    .map((s) => ({
      id: s.id || "",
      practitioner: (s.actor as { reference?: string; display?: string }[])?.[0]?.display || "",
      practitionerRef: (s.actor as { reference?: string }[])?.[0]?.reference || "",
      practitionerId: ((s.actor as { reference?: string }[])?.[0]?.reference || "").replace("Practitioner/", ""),
      start: (s.planningHorizon as { start?: string })?.start?.slice(0, 10) || "",
      end: (s.planningHorizon as { end?: string })?.end?.slice(0, 10) || "",
      reason: String(s.comment || ""),
    }))
    .filter((l) => !practitionerId || l.practitionerRef === `Practitioner/${practitionerId}`)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export async function saveLeave(input: {
  id?: string;
  practitionerId: string;
  practitionerName: string;
  start: string;
  end: string;
  reason: string;
}) {
  const resource: FhirResource = {
    resourceType: "Schedule",
    ...(input.id ? { id: input.id } : {}),
    active: false,
    identifier: [{ system: SYSTEMS.leave, value: `${input.practitionerId}-${input.start}` }],
    actor: [{ reference: `Practitioner/${input.practitionerId}`, display: input.practitionerName }],
    planningHorizon: { start: input.start, end: input.end },
    comment: input.reason,
  };
  return input.id ? fhirUpdate(resource) : fhirCreate(resource);
}

export { DAY_NAMES };
