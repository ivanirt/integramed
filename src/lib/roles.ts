export const SYSTEMS = {
  login: "https://integramed.app/fhir/login",
  role: "https://integramed.app/fhir/role",
  moduleConfig: "https://integramed.app/fhir/id/clinic-modules",
  clinicHours: "https://integramed.app/fhir/id/clinic-hours",
  practitionerHours: "https://integramed.app/fhir/id/practitioner-hours",
  holiday: "https://integramed.app/fhir/id/holiday",
  leave: "https://integramed.app/fhir/id/leave",
  inventory: "https://integramed.app/fhir/id/inventory-item",
  integrativeCatalog: "https://integramed.app/fhir/id/clinic-integrative-modalities",
  hoursExtension: "https://integramed.app/fhir/StructureDefinition/weekly-hours",
  payload: "https://integramed.app/fhir/StructureDefinition/app-payload",
};

export type RoleId =
  | "doctor"
  | "therapist"
  | "nurse"
  | "receptionist"
  | "admin"
  | "lab"
  | "pharmacist";

export const ROLE_LABELS: Record<RoleId, string> = {
  doctor: "Médico",
  therapist: "Terapeuta",
  nurse: "Enfermería",
  receptionist: "Recepción",
  admin: "Administración",
  lab: "Laboratorio",
  pharmacist: "Farmacia",
};

export const DEFAULT_MODULES: Record<string, boolean> = {
  home: true,
  agenda: true,
  patients: true,
  farmacia: true,
  personal: true,
  boveda: true,
  iris: true,
};

export const ROLE_SCREENS: Record<RoleId, string[]> = {
  doctor: ["home", "agenda", "patients", "consulta", "iris", "horario", "ausencias", "boveda", "perfil"],
  therapist: ["home", "agenda", "patients", "consulta", "iris", "horario", "ausencias", "boveda", "perfil"],
  nurse: ["home", "agenda", "patients", "consulta", "iris", "horario", "ausencias", "boveda", "perfil"],
  receptionist: ["home", "agenda", "patients", "perfil"],
  admin: ["home", "agenda", "patients", "consulta", "iris", "horario", "ausencias", "farmacia", "personal", "boveda", "config", "perfil"],
  lab: ["home", "patients", "iris", "boveda", "perfil"],
  pharmacist: ["home", "farmacia", "patients", "perfil"],
};

export function canAccess(role: RoleId, screen: string, modules = DEFAULT_MODULES) {
  if (screen === "perfil") return true;
  if (screen === "config") return role === "admin";
  if (!ROLE_SCREENS[role]?.includes(screen)) return false;
  if (screen === "consulta" || screen === "horario" || screen === "ausencias") return true;
  const key = screen === "patients" ? "patients" : screen;
  return modules[key] !== false;
}

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
