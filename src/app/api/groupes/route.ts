// FR-REF-01/02 (référentiel académique) : création d'un groupe par la
// Scolarité. Même schéma que /api/salles — GET plutôt qu'un import statique
// côté page, pour partager l'état à jour entre pages et route handlers.
import { NextResponse } from "next/server";
import { MOCK_GROUPES } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ groupes: MOCK_GROUPES });
}

export async function POST(request: Request) {
  const { nom, filiere, niveau, effectif } = await request.json();

  if (!nom?.trim() || !filiere?.trim() || !niveau?.trim()) {
    return NextResponse.json(
      { erreur: "Le nom, la filière et le niveau sont obligatoires." },
      { status: 400 }
    );
  }

  const effectifNum = Number(effectif);
  if (!Number.isInteger(effectifNum) || effectifNum <= 0) {
    return NextResponse.json(
      { erreur: "L'effectif doit être un nombre entier positif." },
      { status: 400 }
    );
  }

  const dejaUtilise = MOCK_GROUPES.some((g) => g.nom.toLowerCase() === nom.trim().toLowerCase());
  if (dejaUtilise) {
    return NextResponse.json({ erreur: "Un groupe porte déjà ce nom." }, { status: 409 });
  }

  const groupe = {
    id: `g-${crypto.randomUUID().slice(0, 8)}`,
    nom: nom.trim(),
    filiere: filiere.trim(),
    niveau: niveau.trim(),
    effectif: effectifNum,
  };
  MOCK_GROUPES.push(groupe);

  return NextResponse.json({ groupe });
}
