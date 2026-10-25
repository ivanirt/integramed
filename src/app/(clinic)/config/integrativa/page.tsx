import { loadModules } from "@/lib/clinic-config";
import { loadIntegrativeCatalog } from "@/lib/integrative";
import { resolveIridologyAccess } from "@/lib/iridology-access";
import { IntegrativeCatalogForm } from "@/components/consult/IntegrativeCatalogForm";

export default async function IntegrativaConfigPage() {
  const [{ items, id }, modules] = await Promise.all([
    loadIntegrativeCatalog(),
    loadModules().catch(() => ({ modules: {} as Record<string, boolean> })),
  ]);
  const access = resolveIridologyAccess(modules.modules, items);
  return (
    <div>
      <h2 className="font-serif text-2xl">Medicina integrativa</h2>
      <p className="mt-2 mb-6 text-sm text-[#6D5E52]">
        Catálogo de la clínica. Lo que esté marcado aparece por defecto a la derecha de la consulta; el médico puede
        apagarlo en esa visita. Iridología es el único interruptor del mapa de iris: si está activa, médico, terapeuta,
        enfermería y administración entran a /iris. Laboratorio no entra.
      </p>
      {access.legacyConflict ? (
        <p className="mb-6 border border-[#EADBCE] bg-white px-4 py-3 text-sm">
          Un ajuste antiguo del módulo iris mantiene el mapa visible. Al guardar este catálogo, manda solo Iridología.
        </p>
      ) : null}
      <IntegrativeCatalogForm initial={items} fhirId={id} />
    </div>
  );
}
