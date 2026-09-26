import { loadIntegrativeCatalog } from "@/lib/integrative";
import { IntegrativeCatalogForm } from "@/components/consult/IntegrativeCatalogForm";

export default async function IntegrativaConfigPage() {
  const { items, id } = await loadIntegrativeCatalog();
  return (
    <div>
      <h2 className="font-serif text-2xl">Medicina integrativa</h2>
      <p className="mt-2 mb-6 text-sm text-[#6D5E52]">
        Catálogo de la clínica. Lo que esté marcado aparece por defecto a la derecha de la consulta; el médico puede
        apagarlo en esa visita.
      </p>
      <IntegrativeCatalogForm initial={items} fhirId={id} />
    </div>
  );
}
