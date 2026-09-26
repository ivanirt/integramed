import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-serif text-4xl">Página no encontrada</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">Esa ruta no existe. No se abre el listado de pacientes.</p>
      <Link href="/" className="mt-6 inline-block border border-[#EADBCE] px-4 py-2 text-sm">
        Ir al inicio
      </Link>
    </div>
  );
}
