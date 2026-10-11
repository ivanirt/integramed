import { KNOWN_ROLES } from './sessionAuth.js';

export const LOGIN_SYSTEM = 'https://integramed.app/fhir/login';
export const ROLE_SYSTEM = 'https://integramed.app/fhir/role';

function emailOf(resource) {
  const telecom = Array.isArray(resource?.telecom) ? resource.telecom : [];
  const found = telecom.find((item) => item?.system === 'email' && item.value);
  return String(found?.value || '').trim().toLowerCase();
}

function identifierValue(resource, system) {
  const ids = Array.isArray(resource?.identifier) ? resource.identifier : [];
  const found = ids.find((item) => item?.system === system && item.value);
  return String(found?.value || '').trim();
}

function loginOf(resource) {
  return (identifierValue(resource, LOGIN_SYSTEM) || emailOf(resource) || resource?.id || '').trim().toLowerCase();
}

function displayName(resource) {
  const name = Array.isArray(resource?.name) ? resource.name[0] : resource?.name;
  if (!name || typeof name !== 'object') return resource?.id || '';
  if (name.text) return String(name.text);
  const given = Array.isArray(name.given) ? name.given.join(' ') : '';
  return `${given} ${name.family || ''}`.trim() || resource?.id || '';
}

function rolesFor(practitioner, roleResources) {
  const linked = (roleResources || []).filter((item) => {
    const ref = item?.practitioner?.reference || '';
    return ref === `Practitioner/${practitioner.id}`;
  });
  const fromRoles = linked.flatMap((item) => {
    const codes = Array.isArray(item?.code) ? item.code : [];
    return codes.flatMap((entry) => (Array.isArray(entry?.coding) ? entry.coding : []));
  }).map((coding) => coding?.code).filter(Boolean);
  const fromId = identifierValue(practitioner, ROLE_SYSTEM).split(',').map((item) => item.trim()).filter(Boolean);
  const roles = [...new Set([...fromRoles, ...fromId])].filter((role) => KNOWN_ROLES.has(role));
  return roles.length ? roles : ['doctor'];
}

/** One staff identity for login or password reset. No clinical resource body. */
export function findAuthStaff(practitioners, roleResources, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  const match = (practitioners || []).find((item) => item?.resourceType === 'Practitioner' && item.id && (loginOf(item) === q || emailOf(item) === q));
  if (!match) return null;
  const roles = rolesFor(match, roleResources);
  const email = emailOf(match);
  const login = loginOf(match);
  return {
    id: String(match.id),
    name: displayName(match),
    login,
    email: email || login,
    roles,
    primaryRole: roles[0]
  };
}
