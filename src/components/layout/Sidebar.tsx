"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Building2,
  Calendar,
  HelpCircle,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  School,
  Shapes,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { apiFetch } from "@/lib/api";
import { MotDePasseModal } from "@/components/layout/MotDePasseModal";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Calendar;
}

// [V3] Deux rôles seulement. « Demandes » a disparu avec le circuit de
// signalement enseignant (02_SRS §2.7) : l'enseignant téléphone désormais au
// Gestionnaire, qui corrige directement le programme.
// [V3.1] « Étudiants » a disparu avec le référentiel nominatif : l'effectif
// d'un groupe est un nombre saisi dans la section Groupes.
const NAV_ITEMS: Record<Role, NavItem[]> = {
  scolarite: [
    { href: "/scolarite", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/scolarite/planning", label: "Programmes", icon: Calendar },
    { href: "/scolarite/salles", label: "Salles", icon: Building2 },
    { href: "/scolarite/groupes", label: "Promotions", icon: Users },
    { href: "/scolarite/cours", label: "Cours", icon: BookOpen },
    { href: "/scolarite/departements", label: "Départements", icon: School },
    // [V8] Placée juste après « Départements » : une spécialité se rattache
    // à un département, et c'est dans cet ordre qu'on les déclare.
    { href: "/scolarite/specialites", label: "Spécialités", icon: Shapes },
    { href: "/scolarite/audit", label: "Journal d'audit", icon: History },
  ],
  // FR-ADMIN-01/02/03 : l'Admin ne gère plus lui-même de référentiel/planning
  // (délégué aux Gestionnaires) — sa navigation ne porte que sur la création
  // d'UFR/Gestionnaires et la supervision transverse en lecture.
  admin: [
    { href: "/admin", label: "Supervision", icon: LayoutDashboard },
    { href: "/admin/ufrs", label: "Établissements", icon: Landmark },
    { href: "/admin/audit", label: "Journal d'audit", icon: History },
  ],
};

export function Sidebar({
  role,
  roleLabel,
  nom,
  prenom,
  cheminBase,
  onNavigate,
}: {
  role: Role;
  roleLabel: string;
  nom: string;
  prenom: string;
  // [V8] Préfixe sous lequel l'espace est réellement servi. Les href de
  // NAV_ITEMS restent écrits avec le chemin interne (`/admin/...`), seul
  // vocabulaire compréhensible dans ce fichier ; c'est ici qu'ils sont
  // traduits vers l'URL que voit le navigateur. Le chemin n'arrive donc
  // dans la page que d'un Admin déjà authentifié, jamais dans le bundle
  // JavaScript servi à tout le monde (cf. src/lib/espace-admin.ts).
  cheminBase?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [motDePasseOuvert, setMotDePasseOuvert] = useState(false);

  const items = NAV_ITEMS[role].map((item) =>
    cheminBase && item.href.startsWith("/admin")
      ? { ...item, href: `${cheminBase}${item.href.slice("/admin".length)}` }
      : item
  );

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
            const hrefActif = [...items]
              .sort((a, b) => b.href.length - a.href.length)
              .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;

            return items.map(({ href, label, icon: Icon }) => {
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
        {/* [V8.3] Le bloc d'identité devient le point d'entrée des
            réglages du compte — pour l'instant le seul : changer son mot de
            passe (FR-AUTH-07).

            C'est l'endroit où on le cherche : un utilisateur qui veut agir
            sur SON compte clique sur son nom. Une entrée « Paramètres » de
            plus dans la navigation aurait ajouté une rubrique à un menu qui
            liste des sections de travail, pour une action qu'on fait deux
            fois par an. */}
        <div className="mt-3 border-t border-border pt-3">
          <button
            onClick={() => setMotDePasseOuvert(true)}
            title="Changer mon mot de passe"
            className="flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-muted"
          >
            <Avatar nom={nom} prenom={prenom} />
            <span className="flex min-w-0 flex-col">
              <span className="min-w-0 truncate text-sm text-text">
                {prenom} {nom}
              </span>
              <span className="text-xs text-text-subtle">Mon mot de passe</span>
            </span>
          </button>
        </div>
      </div>

      {motDePasseOuvert ? <MotDePasseModal onClose={() => setMotDePasseOuvert(false)} /> : null}
    </aside>
  );
}
