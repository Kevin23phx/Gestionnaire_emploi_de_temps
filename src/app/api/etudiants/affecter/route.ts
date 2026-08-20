// Affecte en une seule requête un lot d'étudiants déjà connus du référentiel
// à un groupe (ou les en retire, avec groupeId: null) — le second mécanisme
// pour peupler un groupe sans ressaisie : rechercher/cocher plutôt
// qu'importer, pour des étudiants déjà présents dans Campus Manager (ex.
// transfert d'un groupe à un autre, ou tri d'un lot fraîchement importé).
import { NextResponse } from "next/server";
import { MOCK_ETUDIANTS, MOCK_GROUPES, recalculerEffectif } from "@/lib/mock-data";

export async function POST(request: Request) {
  const { etudiantIds, groupeId } = (await request.json()) as {
    etudiantIds: string[];
    groupeId: string | null;
  };

  if (!Array.isArray(etudiantIds) || etudiantIds.length === 0) {
    return NextResponse.json({ erreur: "Aucun étudiant sélectionné." }, { status: 400 });
  }
  if (groupeId && !MOCK_GROUPES.some((g) => g.id === groupeId)) {
    return NextResponse.json({ erreur: "Groupe introuvable." }, { status: 404 });
  }

  const groupesAffectes = new Set<string>();
  const modifies = [];

  for (const id of etudiantIds) {
    const etudiant = MOCK_ETUDIANTS.find((e) => e.id === id);
    if (!etudiant) continue;
    if (etudiant.groupeId) groupesAffectes.add(etudiant.groupeId);
    etudiant.groupeId = groupeId ?? undefined;
    if (groupeId) groupesAffectes.add(groupeId);
    modifies.push(etudiant);
  }

  for (const id of groupesAffectes) recalculerEffectif(id);

  return NextResponse.json({ etudiants: modifies });
}
