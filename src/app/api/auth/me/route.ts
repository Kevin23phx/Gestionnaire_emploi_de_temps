// Le cookie de session est httpOnly (volontairement, cf. session.ts) : un
// Client Component ne peut pas le lire directement. Cette route lui donne un
// moyen propre de savoir qui est connecté (ex. pour attribuer une entrée
// d'audit à son auteur, FR-AUD-01) sans exposer le cookie brut au JS client.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  }
  return NextResponse.json({ nom: session.nom, prenom: session.prenom, role: session.role });
}
