import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

// FR-EDT-06 / INT-06 : point d'entrée unique qui vérifie la session et le
// rôle avant de rendre quoi que ce soit — la protection réelle des données
// reste du ressort de l'API (RBAC Guard, cf. 04_Exigence_Architecture), ceci
// n'est qu'une garde d'expérience utilisateur côté frontend.
export async function RoleGuardShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== role) {
    redirect("/connexion");
  }

  return (
    <div className="flex flex-1">
      <Sidebar role={role} nom={session.nom} prenom={session.prenom} />
      <div className="flex flex-1 flex-col">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
