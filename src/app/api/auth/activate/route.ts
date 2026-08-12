// Mock d'activation de compte — FR-AUTH-03/04 : le compte existe déjà (import
// de référentiel par la Scolarité), l'utilisateur ne fait que définir son mot
// de passe. Aucune création de compte en libre-service n'est possible ici.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MOCK_UTILISATEURS } from "@/lib/mock-data";
import { SESSION_COOKIE, type Session } from "@/lib/session";

export async function POST(request: Request) {
  const { identifiant, nouveauMotDePasse, confirmationMotDePasse } =
    await request.json();

  if (!nouveauMotDePasse || nouveauMotDePasse !== confirmationMotDePasse) {
    return NextResponse.json(
      { erreur: "Les deux mots de passe ne correspondent pas." },
      { status: 400 }
    );
  }

  const utilisateur = MOCK_UTILISATEURS.find(
    (u) => u.identifiant === identifiant
  );

  if (!utilisateur) {
    return NextResponse.json(
      {
        erreur:
          "Identifiant inconnu. Ce compte doit d'abord être créé par la scolarité de votre UFR.",
      },
      { status: 404 }
    );
  }

  // Dans la vraie API : persister le nouveau mot de passe (hash) sur le compte pré-provisionné.
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
