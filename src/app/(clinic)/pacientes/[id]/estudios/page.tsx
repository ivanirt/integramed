import Link from "next/link";
import { fhirSearch } from "@/lib/fhir";
import { createServiceRequestAction, saveDiagnosticReportAction } from "@/lib/actions";
import { loadAccessModules } from "@/lib/clinic-config";
import { canAccess, type RoleId } from "@/lib/roles";
import { requireScreen } from "@/lib/require";
import { Button, Field, Input, Textarea } from "@/components/ui";

export default async function EstudiosPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireScreen("patients");
  const modules = await loadAccessModules().catch(() => ({}) as Record<string, boolean>);
  const showIris = canAccess(user.role as RoleId, "iris", modules);
  const { id } = await params;
  const [orders, reports] = await Promise.all([
    fhirSearch("ServiceRequest", { patient: id }),
    fhirSearch("DiagnosticReport", { patient: id }),
  ]);
  return (
    <div className="space-y-10">
      {showIris ? (
        <p className="text-sm text-[#6D5E52]">
          <Link href={`/iris?paciente=${id}`} className="underline">
            Abrir mapa de iris
          </Link>
          . La foto se queda en el navegador; si anotas la ficha, Estudios solo recibe el texto.
        </p>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl">Estudios pedidos</h2>
        <p className="mt-2 text-sm text-[#6D5E52]">ServiceRequest para el pedido, DiagnosticReport para el resultado.</p>
        <form action={createServiceRequestAction} className="mt-4 flex gap-3">
          <input type="hidden" name="patientId" value={id} />
          <Input name="study" placeholder="Hemograma, RM lumbar…" required />
          <Button type="submit">Pedir</Button>
        </form>
        <ul className="mt-4 text-sm">
          {orders.map((o) => (
            <li key={o.id}>
              {(o.code as { text?: string } | undefined)?.text} · {String(o.status)}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Resultados</h2>
        <form action={saveDiagnosticReportAction} className="mt-4 space-y-3">
          <input type="hidden" name="patientId" value={id} />
          <Field label="Estudio">
            <Input name="title" required />
          </Field>
          <Field label="Conclusión">
            <Textarea name="conclusion" rows={4} />
          </Field>
          <Button type="submit">Guardar reporte</Button>
        </form>
        <ul className="mt-4 text-sm">
          {reports.map((r) => (
            <li key={r.id}>
              {(r.code as { text?: string } | undefined)?.text}: {String(r.conclusion || "")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
