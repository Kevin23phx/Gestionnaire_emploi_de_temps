// FR-AUD-01/03 : journal d'audit, écriture seule (append-only, INV-04).
// GET plutôt qu'un import statique côté page, pour la même raison que
// enseignants/salles : Turbopack ne garantit pas le partage d'instance de
// module entre une Route Handler et une Page en dev (cf. README).
import { NextResponse } from "next/server";
import { MOCK_AUDIT } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ entries: MOCK_AUDIT });
}

export async function POST(request: Request) {
  const { auteur, action, motif } = await request.json();

  if (!auteur?.trim() || !action?.trim()) {
    return NextResponse.json(
      { erreur: "Auteur et action sont obligatoires." },
      { status: 400 }
    );
  }

  const entry = {
    id: `a-${crypto.randomUUID().slice(0, 8)}`,
    auteur: auteur.trim(),
    dateHeure: new Date().toISOString(),
    action: action.trim(),
    motif: motif?.trim() || "—",
  };
  MOCK_AUDIT.push(entry);

  return NextResponse.json({ entry });
}
