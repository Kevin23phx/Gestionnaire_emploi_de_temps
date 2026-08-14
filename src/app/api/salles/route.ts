// FR-REF-02 : création d'une salle par la Scolarité, avec les attributs
// requis par la gouvernance des salles (§4.1 cahier des charges). Pour le
// MVP (une seule UFR pilote), structureGestionnaire est toujours fixée à
// "UFR_PILOTE" — le champ existe déjà dans le modèle pour la V2.
import { NextResponse } from "next/server";
import { MOCK_SALLES } from "@/lib/mock-data";
import type { TypeUsageSalle } from "@/lib/types";

const TYPES_VALIDES: TypeUsageSalle[] = ["propre", "commune", "louee", "gratuite"];

// GET plutôt qu'un import statique côté page : en dev, Turbopack ne partage
// pas toujours la même instance de module entre une Route Handler et une
// Page — passer par une vraie requête HTTP garantit de lire l'état à jour.
export async function GET() {
  return NextResponse.json({ salles: MOCK_SALLES });
}

export async function POST(request: Request) {
  const { nom, batiment, capacite, typeUsage } = await request.json();

  if (!nom?.trim() || !batiment?.trim()) {
    return NextResponse.json(
      { erreur: "Le nom et le bâtiment sont obligatoires." },
      { status: 400 }
    );
  }

  const capaciteNum = Number(capacite);
  if (!Number.isInteger(capaciteNum) || capaciteNum <= 0) {
    return NextResponse.json(
      { erreur: "La capacité doit être un nombre entier positif." },
      { status: 400 }
    );
  }

  if (!TYPES_VALIDES.includes(typeUsage)) {
    return NextResponse.json({ erreur: "Type d'usage invalide." }, { status: 400 });
  }

  const dejaUtilisee = MOCK_SALLES.some(
    (s) => s.nom.toLowerCase() === nom.trim().toLowerCase()
  );
  if (dejaUtilisee) {
    return NextResponse.json(
      { erreur: "Une salle porte déjà ce nom." },
      { status: 409 }
    );
  }

  const salle = {
    id: `s-${crypto.randomUUID().slice(0, 8)}`,
    nom: nom.trim(),
    batiment: batiment.trim(),
    capacite: capaciteNum,
    structureGestionnaire: "UFR_PILOTE" as const,
    typeUsage: typeUsage as TypeUsageSalle,
  };
  MOCK_SALLES.push(salle);

  return NextResponse.json({ salle });
}
