"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

// [V3] Deux rôles : les espaces Étudiant et Enseignant ont disparu avec
// leurs comptes — la consultation se fait à la racine du site, sans
// connexion (FR-PUB-01).
const ROLE_LABEL: Record<Role, string> = {
  scolarite: "Portail Scolarité",
  admin: "Espace Admin",
};

// La majorité des utilisateurs consultent Campus Manager depuis un
// smartphone (cahier des charges §1.4) : sous md, la sidebar devient un
// tiroir masqué par défaut plutôt qu'une colonne fixe qui écraserait le
// contenu.
export function AppShell({
  role,
  nom,
  prenom,
  children,
  cheminBase,
}: {
  role: Role;
  nom: string;
  prenom: string;
  children: ReactNode;
  // [V8] Simple relais vers la Sidebar — voir RoleGuardShell.
  cheminBase?: string;
}) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-w-0 flex-1">
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
        <button
          onClick={() => setOuvert(true)}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1.5 hover:bg-surface-muted"
        >
          <Menu className="h-5 w-5 text-text" aria-hidden="true" />
        </button>
        <span className="text-sm font-bold text-brand">Campus Manager</span>
      </div>

      {ouvert ? (
        <div
          onClick={() => setOuvert(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0 ${
          ouvert ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          role={role}
          roleLabel={ROLE_LABEL[role]}
          nom={nom}
          prenom={prenom}
          cheminBase={cheminBase}
          onNavigate={() => setOuvert(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <OfflineBanner />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
