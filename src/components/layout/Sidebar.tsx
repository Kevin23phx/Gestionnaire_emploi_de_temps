"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { apiFetch } from "@/lib/api";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Calendar;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  etudiant: [
    { href: "/etudiant", label: "Emploi du temps", icon: Calendar },
    { href: "/etudiant/notifications", label: "Notifications", icon: Bell },
  ],
  enseignant: [
    { href: "/enseignant", label: "Mon Planning", icon: Calendar },
    { href: "/enseignant/demandes", label: "Mes demandes", icon: ClipboardCheck },
  ],
  scolarite: [
    { href: "/scolarite", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/scolarite/planning", label: "Programmes", icon: Calendar },
    { href: "/scolarite/salles", label: "Salles", icon: Building2 },
    { href: "/scolarite/groupes", label: "Groupes", icon: Users },
    { href: "/scolarite/etudiants", label: "Étudiants", icon: GraduationCap },
    { href: "/scolarite/cours", label: "Cours", icon: BookOpen },
    { href: "/scolarite/demandes", label: "Demandes", icon: ClipboardCheck },
    { href: "/scolarite/audit", label: "Journal d'audit", icon: History },
  ],
  // FR-ADMIN-01/02/03 : l'Admin ne gère plus lui-même de référentiel/planning
  // (délégué aux Gestionnaires) — sa navigation ne porte que sur la création
  // d'UFR/Gestionnaires et la supervision transverse en lecture.
  admin: [
    { href: "/admin", label: "Supervision", icon: LayoutDashboard },
    { href: "/admin/ufrs", label: "UFR", icon: Landmark },
    { href: "/admin/audit", label: "Journal d'audit", icon: History },
  ],
};

export function Sidebar({
  role,
  roleLabel,
  nom,
  prenom,
  onNavigate,
}: {
  role: Role;
  roleLabel: string;
  nom: string;
  prenom: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleDeconnexion() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.push("/connexion");
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col justify-between border-r border-border bg-surface px-4 py-6">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <Image
            src="/logo-universite.png"
            alt="Université Joseph Ki-Zerbo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <div>
            <p className="text-sm font-bold leading-none text-brand">Campus Manager</p>
            <p className="text-xs text-text-subtle">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {/* Le lien actif est le href le plus long qui correspond au chemin
              courant (exact ou suivi de "/") : nécessaire depuis que
              /scolarite/planning a une sous-route dynamique
              ([groupeId]) — sinon un simple `pathname === href` ferait
              disparaître le surlignage dès qu'on ouvre un programme. */}
          {(() => {
            const hrefActif = [...NAV_ITEMS[role]]
              .sort((a, b) => b.href.length - a.href.length)
              .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;

            return NAV_ITEMS[role].map(({ href, label, icon: Icon }) => {
              const actif = href === hrefActif;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    actif
                      ? "bg-brand-light font-medium text-brand"
                      : "text-text-muted hover:bg-surface-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            });
          })()}
        </nav>
      </div>

      <div>
        <Link
          href="/aide"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-muted"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Aide
        </Link>
        <button
          onClick={handleDeconnexion}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-muted"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Déconnexion
        </button>
        <div className="mt-3 flex items-center gap-2 border-t border-border px-3 pt-3">
          <Avatar nom={nom} prenom={prenom} />
          <span className="truncate text-sm text-text">
            {prenom} {nom}
          </span>
        </div>
      </div>
    </aside>
  );
}
