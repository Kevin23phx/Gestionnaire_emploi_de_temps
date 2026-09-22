import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { AppShell } from "@/components/layout/AppShell";

// FR-EDT-06 / INT-06 : point d'entrée unique qui vérifie la session et le
// rôle avant de rendre quoi que ce soit — la protection réelle des données
// reste du ressort de l'API (RBAC Guard, cf. 04_Exigence_Architecture), ceci
// n'est qu'une garde d'expérience utilisateur côté frontend.
export async function RoleGuardShell({
  role,
  children,
  cheminBase,
  masquerSiRefuse = false,
}: {
  role: Role;
  children: ReactNode;
  // [V8] Préfixe réel des liens de navigation, quand l'espace n'est pas
  // servi sous son chemin interne (cas de l'espace Admin, cf.
  // src/lib/espace-admin.ts). Absent = les liens valent leur href tel quel.
  cheminBase?: string;
  // [V8] Répondre 404 plutôt que rediriger vers /connexion quand l'accès
  // est refusé. Une redirection est le comportement juste pour le Portail
  // Scolarité — elle dit au gestionnaire déconnecté quoi faire — mais pour
  // l'espace Admin elle CONFIRME l'existence de la section à qui tâtonne.
  // Les deux espaces n'ont donc pas la même réponse au même refus, et
  // c'est délibéré.
  masquerSiRefuse?: boolean;
}) {
  const session = await getSession();
  if (!session || session.role !== role) {
    if (masquerSiRefuse) notFound();
    redirect("/connexion");
  }

  return (
    <AppShell role={role} nom={session.nom} prenom={session.prenom} cheminBase={cheminBase}>
      {children}
    </AppShell>
  );
}
