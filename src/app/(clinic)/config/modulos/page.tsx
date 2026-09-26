import { loadModules } from "@/lib/clinic-config";
import { ModulesForm } from "@/components/ModulesForm";

export default async function ModulosPage() {
  const { modules, id } = await loadModules();
  return (
    <div>
      <h2 className="font-serif text-2xl">Módulos</h2>
      <p className="mt-2 mb-6 text-sm text-[#6D5E52]">
        Visibilidad de la clínica, además del filtro por rol. Se guarda como Basic.
      </p>
      <ModulesForm initial={modules} fhirId={id} />
    </div>
  );
}
