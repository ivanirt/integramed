import Link from "next/link";

export function PatientNav({ id, showIris = false }: { id: string; showIris?: boolean }) {
  const items = [
    { href: `/pacientes/${id}`, label: "Resumen" },
    { href: `/pacientes/${id}/consultas`, label: "Consultas" },
    { href: `/pacientes/${id}/recetas`, label: "Recetas" },
    { href: `/pacientes/${id}/estudios`, label: "Estudios" },
    ...(showIris ? [{ href: `/iris?paciente=${id}`, label: "Mapa de iris" }] : []),
  ];
  return (
    <nav className="mt-4 flex flex-wrap gap-4 text-sm text-[#6D5E52]">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border border-[#EADBCE] bg-white px-3 py-2 ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full border border-[#EADBCE] bg-white px-3 py-2 ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full border border-[#EADBCE] bg-white px-3 py-2 ${props.className || ""}`} />;
}

export function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`border border-[#241B16] bg-[#241B16] px-4 py-2 text-sm text-[#FAF7F2] disabled:opacity-50 ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`border border-[#EADBCE] px-4 py-2 text-sm ${props.className || ""}`}>
      {children}
    </button>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-[#EADBCE] bg-white px-6 py-10 text-sm text-[#6D5E52]">
      <p className="text-[#241B16]">{title}</p>
      {hint ? <p className="mt-1">{hint}</p> : null}
    </div>
  );
}
