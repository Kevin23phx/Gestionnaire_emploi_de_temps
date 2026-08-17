// FR-REF-01 (référentiel académique) : création d'une unité d'enseignement
// par la Scolarité. Même schéma que /api/salles et /api/groupes. Cette route
// sert aussi le raccourci "+ Autre (préciser)" du formulaire de créneau
// (CreneauFormModal) : une UE créée à la volée depuis là doit apparaître ici
// aussi, une seule source de vérité (cf. FR-REF-04/05, même logique pour les
// enseignants).
import { NextResponse } from "next/server";
import { MOCK_UNITES_ENSEIGNEMENT } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ cours: MOCK_UNITES_ENSEIGNEMENT });
}

export async function POST(request: Request) {
  const { code, intitule } = await request.json();

  if (!intitule?.trim()) {
    return NextResponse.json({ erreur: "L'intitulé est obligatoire." }, { status: 400 });
  }

  const dejaUtilise = MOCK_UNITES_ENSEIGNEMENT.some(
    (u) => u.intitule.toLowerCase() === intitule.trim().toLowerCase()
  );
  if (dejaUtilise) {
    return NextResponse.json({ erreur: "Un cours porte déjà cet intitulé." }, { status: 409 });
  }

  const ue = {
    id: `ue-${crypto.randomUUID().slice(0, 8)}`,
    code: code?.trim() || "—",
    intitule: intitule.trim(),
  };
  MOCK_UNITES_ENSEIGNEMENT.push(ue);

  return NextResponse.json({ ue });
}
