import Link from "next/link";
import { requireAdmin } from "@/lib/require";

const LINKS = [
  { href: "/personal", label: "Profesionales" },
  { href: "/horario", label: "Horarios" },
  { href: "/ausencias", label: "Días libres" },
  { href: "/config/horario", label: "Apertura clínica" },
  { href: "/config/festivos", label: "Festivos" },
  { href: "/config/servicios", label: "Servicios" },
  { href: "/config/sedes", label: "Sedes" },
  { href: "/config/modulos", label: "Módulos" },
  { href: "/config/integrativa", label: "Integrativa" },
  { href: "/config/fhir", label: "FHIR" },
];

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Configuración</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">Una ruta por tema. Horario, festivos y ausencias viven en Schedule.</p>
      <nav className="mt-4 flex flex-wrap gap-4 text-sm text-[#6D5E52]">
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
