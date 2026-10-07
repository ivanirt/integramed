import Link from "next/link";
import { requireUser } from "@/lib/require";
import { ROLE_LABELS } from "@/lib/roles";
import { listStaff } from "@/lib/staff";

export default async function PerfilPage() {
  const user = await requireUser();
  const staff = await listStaff();
  const me = staff.find((s) => s.id === user.id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Perfil</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">La sesión es una cookie firmada. La identidad es el Practitioner.</p>
      <dl className="mt-8 max-w-lg space-y-3 text-sm">
        <div>
          <dt className="text-[#6D5E52]">Nombre</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt className="text-[#6D5E52]">Login</dt>
          <dd>{user.login}</dd>
        </div>
        <div>
          <dt className="text-[#6D5E52]">Rol activo</dt>
          <dd>{ROLE_LABELS[user.role]}</dd>
        </div>
        <div>
          <dt className="text-[#6D5E52]">Roles en FHIR</dt>
          <dd>{me?.roles.map((r) => ROLE_LABELS[r] || r).join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-8 text-sm">
        <Link href="/cuenta/contrasena" className="underline">
          Cambiar contraseña
        </Link>
      </p>
    </div>
  );
}
