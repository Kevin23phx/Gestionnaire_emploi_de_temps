// Mock d'authentification — à remplacer par un appel à l'API NestJS (AuthModule,
// cf. 04_Exigence_Architecture_Campus_Manager.md #1) une fois le backend prêt.
// FR-AUTH-01/02 : identifiant + mot de passe, rôle déterminé côté serveur.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MOCK_UTILISATEURS } from "@/lib/mock-data";
import { SESSION_COOKIE, type Session } from "@/lib/session";

export async function POST(request: Request) {
  const { identifiant, motDePasse } = await request.json();

  const utilisateur = MOCK_UTILISATEURS.find(
    (u) => u.identifiant === identifiant && u.motDePasse === motDePasse
  );

  if (!utilisateur) {
    return NextResponse.json(
      { erreur: "Identifiant ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const session: Session = {
    userId: utilisateur.id,
    role: utilisateur.role,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    groupeId: utilisateur.groupeId,
    enseignantId: utilisateur.enseignantId,
  };

  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ role: session.role });
}
