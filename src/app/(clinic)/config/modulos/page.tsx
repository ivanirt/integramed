import { loadModules } from "@/lib/clinic-config";
import { ModulesForm } from "@/components/ModulesForm";
import { loadIntegrativeCatalog } from "@/lib/integrative";
import { resolveIridologyAccess } from "@/lib/iridology-access";

export default async function ModulosPage() {
  const { modules, id } = await loadModules();
  const catalog = await loadIntegrativeCatalog().catch(() => ({ items: [] as { id: string; enabled: boolean }[] }));
  const access = resolveIridologyAccess(modules, catalog.items);
  return (
    <div>
      <h2 className="font-serif text-2xl">Módulos</h2>
      <p className="mt-2 mb-6 text-sm text-[#6D5E52]">
        Visibilidad de la clínica, además del filtro por rol. Se guarda como Basic. El mapa de iris no está en esta
        lista: lo enciende Iridología, en Medicina integrativa.
      </p>
      {access.legacyConflict ? (
        <p className="mb-6 border border-[#EADBCE] bg-white px-4 py-3 text-sm">
          Un ajuste antiguo del módulo iris mantiene el mapa visible aunque Iridología esté apagada. Al guardar estos
          módulos, ese ajuste pasa a Iridología y deja de haber dos interruptores.
        </p>
      ) : null}
      <ModulesForm initial={modules} fhirId={id} />
    </div>
  );
}
