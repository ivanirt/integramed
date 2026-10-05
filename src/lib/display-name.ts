export function displayName(resource?: { id?: string; name?: unknown } | null) {
  const name = Array.isArray(resource?.name) ? resource.name[0] : resource?.name;
  if (!name || typeof name !== "object") return resource?.id || "Sin nombre";
  const n = name as { text?: string; given?: string[]; family?: string };
  if (n.text) return n.text;
  return `${(n.given || []).join(" ")} ${n.family || ""}`.trim() || resource?.id || "Sin nombre";
}
