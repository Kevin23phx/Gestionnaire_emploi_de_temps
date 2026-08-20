// FR-REF-01/02 (référentiel académique) : création d'un groupe par la
// Scolarité. Même schéma que /api/salles — GET plutôt qu'un import statique
// côté page, pour partager l'état à jour entre pages et route handlers.
import { NextResponse } from "next/server";
import { MOCK_GROUPES } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ groupes: MOCK_GROUPES });
}

export async function POST(request: Request) {
  const { nom, filiere, niveau } = await request.json();

  if (!nom?.trim() || !filiere?.trim() || !niveau?.trim()) {
    return NextResponse.json(
      { erreur: "Le nom, la filière et le niveau sont obligatoires." },
      { status: 400 }
    );
  }

  const dejaUtilise = MOCK_GROUPES.some((g) => g.nom.toLowerCase() === nom.trim().toLowerCase());
  if (dejaUtilise) {
    return NextResponse.json({ erreur: "Un groupe porte déjà ce nom." }, { status: 409 });
  }

  // "effectif" démarre à 0 : jamais saisi à la main, seulement dérivé du
  // rattachement d'étudiants (cf. Groupe.effectif dans types.ts et
  // GroupeEtudiantsModal, ouvert automatiquement juste après la création).
  const groupe = {
    id: `g-${crypto.randomUUID().slice(0, 8)}`,
    nom: nom.trim(),
    filiere: filiere.trim(),
    niveau: niveau.trim(),
    effectif: 0,
  };
  MOCK_GROUPES.push(groupe);

  return NextResponse.json({ groupe });
}
