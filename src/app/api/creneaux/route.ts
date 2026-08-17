// FR-EDT-01/02/03 : un créneau appartient toujours à un groupe précis
// (décision de cadrage 2026-08-17 — un "programme" = l'emploi du temps d'un
// seul groupe, jamais mélangé avec celui d'un autre). Cette route est la
// source de vérité partagée entre la liste des programmes
// (/scolarite/planning) et la feuille de chaque groupe
// (/scolarite/planning/[groupeId]) — indispensable pour que le moteur de
// conflits (FR-CONF-01/02) continue à détecter une salle ou un enseignant
// réservé en double ENTRE deux programmes différents, pas seulement à
// l'intérieur d'un seul.
import { NextResponse } from "next/server";
import { MOCK_CRENEAUX_SCOLARITE } from "@/lib/mock-data";
import type { Creneau } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ creneaux: MOCK_CRENEAUX_SCOLARITE });
}

// Accepte un lot de créneaux (une création multi-jours en génère plusieurs
// d'un coup) : chacun est mis à jour s'il existe déjà (id réel), sinon créé.
export async function POST(request: Request) {
  const { creneaux } = (await request.json()) as { creneaux: Creneau[] };

  if (!Array.isArray(creneaux) || creneaux.length === 0) {
    return NextResponse.json({ erreur: "Aucun créneau à enregistrer." }, { status: 400 });
  }

  const resultats: Creneau[] = [];
  for (const entree of creneaux) {
    const indexExistant = MOCK_CRENEAUX_SCOLARITE.findIndex((c) => c.id === entree.id);
    if (indexExistant >= 0) {
      MOCK_CRENEAUX_SCOLARITE[indexExistant] = entree;
      resultats.push(entree);
    } else {
      const creneau = { ...entree, id: `c-${crypto.randomUUID().slice(0, 8)}` };
      MOCK_CRENEAUX_SCOLARITE.push(creneau);
      resultats.push(creneau);
    }
  }

  return NextResponse.json({ creneaux: resultats });
}
