import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RoleGuardShell } from "@/components/layout/RoleGuardShell";
import { CHEMIN_ESPACE_ADMIN, EN_TETE_ESPACE_ADMIN } from "@/lib/espace-admin";

// [V8] Rien de cet espace ne doit être indexé — et surtout PAS via une
// ligne « Disallow » dans robots.txt, qui publierait le chemin qu'on
// cherche justement à ne pas annoncer (les robots.txt sont le premier
// fichier que lit quiconque cartographie un site). L'instruction voyage
// donc dans l'en-tête de la page elle-même, là où seul celui qui l'a déjà
// ouverte peut la lire.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // [V8] La requête est-elle passée par le chemin non annoncé ? Sinon,
  // c'est qu'on a frappé `/admin` en direct : 404, la même réponse
  // qu'aurait donnée n'importe quelle adresse inexistante. Rien ne
  // distingue plus « cette section n'existe pas » de « cette section
  // existe mais pas pour vous » — cf. src/lib/espace-admin.ts.
  const enTetes = await headers();
  if (enTetes.get(EN_TETE_ESPACE_ADMIN) !== "1") {
    notFound();
  }

  return (
    <RoleGuardShell role="admin" cheminBase={CHEMIN_ESPACE_ADMIN} masquerSiRefuse>
      {children}
    </RoleGuardShell>
  );
}
