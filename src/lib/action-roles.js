/** Known clinic roles. An unknown role is never allowed. */
export const ROLES = Object.freeze([
  "doctor",
  "therapist",
  "nurse",
  "receptionist",
  "admin",
  "lab",
  "pharmacist",
]);

const ALL = ROLES;
const ADMIN = Object.freeze(["admin"]);
const AGENDA = Object.freeze(["doctor", "therapist", "nurse", "receptionist", "admin"]);
const CONSULT = Object.freeze(["doctor", "therapist", "nurse", "admin"]);
const PRESCRIBE = Object.freeze(["doctor", "therapist", "admin"]);
const STUDY_ORDER = Object.freeze(["doctor", "therapist", "nurse", "admin"]);
const STUDY_REPORT = Object.freeze(["doctor", "therapist", "lab", "admin"]);
const OWN_SCHEDULE = Object.freeze(["doctor", "therapist", "nurse", "admin"]);
const PHARMACY = Object.freeze(["pharmacist", "admin"]);

export const ADMIN_ONLY_MESSAGE = "Solo administración puede hacer eso.";
export const ROLE_DENIED_MESSAGE = "Esa acción no está disponible para tu rol.";
export const OWN_RECORD_MESSAGE = "Solo puedes editar tu propia información.";

/**
 * Explicit allow-list. Missing actions are denied.
 * "public" is only for unauthenticated auth flows that must stay reachable.
 * Screen alignment: agenda, consulta, patients, farmacia, personal, config.
 */
export const ACTION_ROLES = Object.freeze({
  createPatientAction: ALL,
  createAppointmentAction: AGENDA,
  moveAppointmentAction: AGENDA,
  startConsultFromAppointment: CONSULT,
  saveSoapAction: CONSULT,
  saveVitalsAction: CONSULT,
  beginDoctorConsultAction: CONSULT,
  finalizeConsultAction: CONSULT,
  saveIntegrativeCatalogAction: ADMIN,
  createMedicationRequestAction: PRESCRIBE,
  createServiceRequestAction: STUDY_ORDER,
  saveDiagnosticReportAction: STUDY_REPORT,
  saveHoursAction: ADMIN,
  savePractitionerHoursAction: OWN_SCHEDULE,
  saveHolidayAction: ADMIN,
  deleteHolidayAction: ADMIN,
  deleteResourceAction: ADMIN,
  saveLeaveAction: OWN_SCHEDULE,
  deleteLeaveAction: OWN_SCHEDULE,
  saveModulesAction: ADMIN,
  saveOrgAction: ADMIN,
  saveLocationAction: ADMIN,
  saveServiceAction: ADMIN,
  saveStaffAction: ADMIN,
  saveInventoryAction: PHARMACY,
  authLogin: "public",
  authLogout: "public",
  authRequestReset: "public",
  authCompleteReset: "public",
  authSwitchRole: ALL,
  clinicalAi: CONSULT,
  fhirConfig: ADMIN,
  fhirHealth: ADMIN,
  vaultWrite: ADMIN,
  practitionerWrite: ADMIN,
  configPage: ADMIN,
  personalPage: ADMIN,
});

/** These also require the caller to be the practitioner, unless they are admin. */
export const SELF_OR_ADMIN = new Set([
  "savePractitionerHoursAction",
  "saveLeaveAction",
  "deleteLeaveAction",
]);

const PAGE_RULES = Object.freeze([
  { prefix: "/config", action: "configPage" },
  { prefix: "/personal", action: "personalPage" },
]);

/**
 * @param {string} action
 * @param {string | null | undefined} role
 * @returns {"ok" | "unauthenticated" | "forbidden"}
 */
export function authorizeAction(action, role) {
  if (!action || !Object.prototype.hasOwnProperty.call(ACTION_ROLES, action)) return "forbidden";
  const allowed = ACTION_ROLES[action];
  if (allowed === "public") return "ok";
  if (role == null || role === "") return "unauthenticated";
  if (!ROLES.includes(role)) return "forbidden";
  if (!allowed.includes(role)) return "forbidden";
  return "ok";
}

/**
 * @param {string} pathname
 * @param {string | null | undefined} role
 * @returns {"ok" | "unauthenticated" | "forbidden"}
 */
export function authorizePage(pathname, role) {
  const path = String(pathname || "");
  const rule = PAGE_RULES.find((item) => path === item.prefix || path.startsWith(`${item.prefix}/`));
  if (!rule) return "ok";
  return authorizeAction(rule.action, role);
}

/**
 * @param {string} action
 * @returns {string}
 */
export function denialMessage(action) {
  const allowed = ACTION_ROLES[action];
  if (Array.isArray(allowed) && allowed.length === 1 && allowed[0] === "admin") return ADMIN_ONLY_MESSAGE;
  return ROLE_DENIED_MESSAGE;
}
