// Provisionnement d'un compte enseignant à la volée, déclenché depuis le
// formulaire de créneau quand l'enseignant n'existe pas encore (cf. échange
// avec l'utilisateur du 2026-08-14 : la Scolarité reste seule à l'origine du
// compte — FR-AUTH-04/INT-02 — mais AUCUN mot de passe n'est saisi ici. Le
// compte est créé sans mot de passe ; l'enseignant l'active lui-même via
// /activation, comme n'importe quel compte pré-provisionné (FR-AUTH-03).
import { NextResponse } from "next/server";
import { MOCK_ENSEIGNANTS, MOCK_UTILISATEURS } from "@/lib/mock-data";

export async function POST(request: Request) {
  const { nom, prenom, identifiant } = await request.json();

  if (!nom?.trim() || !prenom?.trim() || !identifiant?.trim()) {
    return NextResponse.json(
      { erreur: "Nom, prénom et identifiant sont obligatoires." },
      { status: 400 }
    );
  }

  const dejaUtilise = MOCK_UTILISATEURS.some((u) => u.identifiant === identifiant);
  if (dejaUtilise) {
    return NextResponse.json(
      { erreur: "Cet identifiant est déjà utilisé par un autre compte." },
      { status: 409 }
    );
  }

  const id = `e-${crypto.randomUUID().slice(0, 8)}`;
  const enseignant = { id, nom: nom.trim(), prenom: prenom.trim() };
  MOCK_ENSEIGNANTS.push(enseignant);

  MOCK_UTILISATEURS.push({
    id: `u-ens-${id}`,
    identifiant,
    motDePasse: "", // pas de mot de passe tant que l'enseignant n'a pas activé son compte
    nom: enseignant.nom,
    prenom: enseignant.prenom,
    role: "enseignant",
    enseignantId: id,
  });

  return NextResponse.json({ enseignant, identifiant });
}
