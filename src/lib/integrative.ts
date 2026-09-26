import { fhirCreate, fhirSearch, fhirUpdate, readExtension, withExtension, SYSTEMS } from "./fhir";

export type IntegrativeModality = {
  id: string;
  labelEs: string;
  enabled: boolean;
};

export const DEFAULT_MODALITIES: IntegrativeModality[] = [
  { id: "tcm", labelEs: "Medicina tradicional china", enabled: true },
  { id: "acupuncture", labelEs: "Acupuntura", enabled: true },
  { id: "ayurveda", labelEs: "Ayurveda", enabled: true },
  { id: "functional", labelEs: "Medicina funcional", enabled: true },
  { id: "homeopathy", labelEs: "Homeopatía", enabled: false },
  { id: "iridology", labelEs: "Iridología", enabled: false },
  { id: "biodescodification", labelEs: "Biodescodificación", enabled: false },
  { id: "stem_cells", labelEs: "Células madre", enabled: false },
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function modalityIdFromLabel(label: string) {
  return slugify(label) || `mod_${Date.now()}`;
}

export async function loadIntegrativeCatalog(): Promise<{ id?: string; items: IntegrativeModality[] }> {
  const basics = await fhirSearch("Basic");
  const match = basics.find((b) => {
    const ids = (b.identifier as { system?: string; value?: string }[]) || [];
    return ids.some((i) => i.system === SYSTEMS.integrativeCatalog);
  });
  if (!match) return { items: DEFAULT_MODALITIES.map((item) => ({ ...item })) };
  const payload = readExtension(match, SYSTEMS.payload) as { items?: IntegrativeModality[] } | IntegrativeModality[] | null;
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!items?.length) return { id: match.id, items: DEFAULT_MODALITIES.map((item) => ({ ...item })) };
  return {
    id: match.id,
    items: items.map((item) => ({
      id: String(item.id || modalityIdFromLabel(item.labelEs)),
      labelEs: String(item.labelEs || item.id),
      enabled: item.enabled !== false,
    })),
  };
}

export async function saveIntegrativeCatalog(items: IntegrativeModality[], id?: string) {
  const resource = withExtension(
    {
      resourceType: "Basic",
      ...(id ? { id } : {}),
      code: { coding: [{ system: SYSTEMS.integrativeCatalog, code: "clinic-integrative-modalities" }] },
      identifier: [{ system: SYSTEMS.integrativeCatalog, value: "clinic-integrative-modalities" }],
    },
    SYSTEMS.payload,
    { items },
  );
  return id ? fhirUpdate(resource) : fhirCreate(resource);
}
