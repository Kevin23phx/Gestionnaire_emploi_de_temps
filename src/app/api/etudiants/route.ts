// FR-REF-01 : référentiel des étudiants. GET liste tout le monde (utilisé
// par la recherche d'étudiants "déjà connus" dans GroupeEtudiantsModal) ;
// POST importe un lot en une seule requête — le mécanisme qui remplace la
// saisie un par un (retour utilisateur du 2026-08-18) : coller/uploader une
// liste plutôt que remplir un formulaire par étudiant. Optionnellement
// affectés directement à un groupe (import + affectation en une action).
import { NextResponse } from "next/server";
import { MOCK_ETUDIANTS, recalculerEffectif } from "@/lib/mock-data";
import type { Etudiant } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ etudiants: MOCK_ETUDIANTS });
}

export async function POST(request: Request) {
  const { etudiants, groupeId } = (await request.json()) as {
    etudiants: Pick<Etudiant, "ine" | "nom" | "prenom" | "filiere" | "niveau">[];
    groupeId?: string;
  };

  if (!Array.isArray(etudiants) || etudiants.length === 0) {
    return NextResponse.json({ erreur: "Aucun étudiant à importer." }, { status: 400 });
  }

  const crees: Etudiant[] = [];
  const doublons: string[] = [];
  const invalides: string[] = [];

  for (const entree of etudiants) {
    const ine = entree.ine?.trim();
    const nom = entree.nom?.trim();
    const prenom = entree.prenom?.trim();

    if (!ine || !nom || !prenom) {
      invalides.push(ine || "(INE manquant)");
      continue;
    }
    if (MOCK_ETUDIANTS.some((e) => e.ine === ine)) {
      doublons.push(ine);
      continue;
    }

    const etudiant: Etudiant = {
      id: `et-${crypto.randomUUID().slice(0, 8)}`,
      ine,
      nom,
      prenom,
      filiere: entree.filiere?.trim() || "",
      niveau: entree.niveau?.trim() || "",
      groupeId,
    };
    MOCK_ETUDIANTS.push(etudiant);
    crees.push(etudiant);
  }

  if (groupeId) recalculerEffectif(groupeId);

  return NextResponse.json({ etudiants: crees, doublons, invalides });
}
