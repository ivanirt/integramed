"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RoleId } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";
import {
  CalendarIcon,
  ClockIcon,
  HomeIcon,
  LogoutIcon,
  OffDayIcon,
  PharmacyIcon,
  SettingsIcon,
  StaffIcon,
  UsersIcon,
  VaultIcon,
} from "@/components/NavIcons";

type User = { id: string; name: string; login: string; role: RoleId };

const DAY = [
  { href: "/", label: "Inicio", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/agenda", label: "Agenda", icon: CalendarIcon, match: (p: string) => p.startsWith("/agenda") },
  { href: "/pacientes", label: "Pacientes", icon: UsersIcon, match: (p: string) => p.startsWith("/pacientes") || p.startsWith("/consulta") },
];

const SECOND: { href: string; label: string; icon: typeof HomeIcon; screen: string }[] = [
  { href: "/horario", label: "Horario", icon: ClockIcon, screen: "horario" },
  { href: "/ausencias", label: "Días libres", icon: OffDayIcon, screen: "ausencias" },
  { href: "/farmacia", label: "Farmacia", icon: PharmacyIcon, screen: "farmacia" },
  { href: "/personal", label: "Personal", icon: StaffIcon, screen: "personal" },
  { href: "/boveda", label: "Bóveda", icon: VaultIcon, screen: "boveda" },
];

const SIDEBAR_KEY = "integramed_sidebar_collapsed";

export function ClinicShell({
  user,
  children,
  screens,
  blocked,
  initialCollapsed = false,
}: {
  user: User;
  children: React.ReactNode;
  screens: string[];
  blocked?: string;
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [roles, setRoles] = useState<RoleId[]>([user.role]);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
        document.cookie = `${SIDEBAR_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    fetch("/api/staff/me")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.roles) && data.roles.length) setRoles(data.roles);
      })
      .catch(() => {});
  }, []);

  async function switchRole(role: RoleId) {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "switch-role", role }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/acceso");
    router.refresh();
  }

  const second = SECOND.filter((item) => screens.includes(item.screen));
  const showConfig = screens.includes("config");

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const linkClass = (active: boolean) =>
    [
      "flex items-center rounded-sm text-sm",
      collapsed ? "justify-center px-0 py-2" : "gap-2 px-2 py-1.5",
      active ? "bg-white text-[#241B16]" : "text-[#6D5E52] hover:text-[#241B16]",
    ].join(" ");

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-[#EADBCE] bg-[#FAF7F2] transition-[width] duration-200 ${collapsed ? "w-[72px]" : "w-60"}`}
      >
        <div className={`flex h-[68px] items-center border-b border-[#EADBCE] ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
          {collapsed ? (
            <Link href="/" className="font-serif text-lg" title="IntegraMed" aria-label="IntegraMed">
              IM
            </Link>
          ) : (
            <div className="min-w-0">
              <Link href="/" className="font-serif text-xl">
                IntegraMed
              </Link>
              <p className="text-xs text-[#6D5E52]">Clínica FHIR R4</p>
            </div>
          )}
          {!collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Contraer menú"
              aria-label="Contraer menú"
              className="border border-[#EADBCE] px-2 py-1 text-xs text-[#6D5E52]"
            >
              ←
            </button>
          ) : null}
        </div>
        {collapsed ? (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Expandir menú"
              aria-label="Expandir menú"
              className="border border-[#EADBCE] px-2 py-1 text-xs text-[#6D5E52]"
            >
              →
            </button>
          </div>
        ) : null}
        <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? "px-2" : "px-3"} py-3`}>
          {DAY.map((item) => {
            const active = item.match(pathname);
            const ItemIcon = item.icon;
            return (
              <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} className={linkClass(active)}>
                <ItemIcon />
                {collapsed ? null : item.label}
              </Link>
            );
          })}
          <div className="my-2 border-t border-[#EADBCE]" />
          {second.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={linkClass(pathname.startsWith(item.href) || (item.href === "/personal" && pathname.startsWith("/personal")))}
              >
                <ItemIcon />
                {collapsed ? null : item.label}
              </Link>
            );
          })}
          {showConfig ? (
            <Link
              href="/config/horario"
              title="Configuración"
              aria-label="Configuración"
              className={linkClass(pathname.startsWith("/config"))}
            >
              <SettingsIcon />
              {collapsed ? null : "Configuración"}
            </Link>
          ) : null}
        </nav>
        <div className={`border-t border-[#EADBCE] ${collapsed ? "px-2 py-3" : "px-3 py-4"} text-sm`}>
          <Link
            href="/perfil"
            title={`${user.name} — ${ROLE_LABELS[user.role]}`}
            aria-label="Mi perfil"
            className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EADBCE] bg-white text-xs font-medium">
              {initials || "?"}
            </span>
            {!collapsed ? (
              <span className="min-w-0">
                <span className="block truncate font-medium text-[#241B16]">{user.name}</span>
                <span className="block text-xs text-[#6D5E52]">{ROLE_LABELS[user.role]}</span>
              </span>
            ) : null}
          </Link>
          {!collapsed && roles.length > 1 ? (
            <select
              className="mt-2 w-full border border-[#EADBCE] bg-white px-2 py-1 text-xs"
              value={user.role}
              onChange={(e) => switchRole(e.target.value as RoleId)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          ) : null}
          {!collapsed ? (
            <button type="button" onClick={logout} className="mt-3 text-xs text-[#6D5E52] underline">
              Salir
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              title="Salir"
              aria-label="Salir"
              className="mt-3 flex w-full justify-center text-[#6D5E52] hover:text-[#241B16]"
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {blocked ? (
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="font-serif text-3xl">Esa pantalla no está disponible</h1>
            <p className="mt-2 text-sm text-[#6D5E52]">{blocked}</p>
            <Link href="/" className="mt-6 inline-block border border-[#EADBCE] px-4 py-2 text-sm">
              Volver al inicio
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
