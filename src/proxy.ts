import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CHEMIN_ESPACE_ADMIN,
  CHEMIN_INTERNE_ADMIN,
  EN_TETE_ESPACE_ADMIN,
} from "@/lib/espace-admin";

/**
 * [V8, 2026-09-21] Aiguillage de l'espace Admin (cf. src/lib/espace-admin.ts
 * pour le pourquoi complet, et ses limites).
 *
 * `proxy.ts` et non `middleware.ts` : le fichier a été renommé dans Next 16,
 * l'ancien nom est déprécié (node_modules/next/dist/docs/01-app/
 * 03-api-reference/03-file-conventions/proxy.md).
 *
 * Deux règles, et rien d'autre :
 *
 * 1. Le chemin non annoncé est **réécrit** vers les pages réelles
 *    (`/admin/...`), avec un en-tête qui atteste du passage par ici. Une
 *    réécriture et non une redirection : une redirection ferait apparaître
 *    `/admin` dans la barre d'adresse, ce qui annulerait tout l'exercice.
 *
 * 2. `/admin` en direct répond **404**, comme n'importe quelle adresse
 *    inexistante — c'est le layout de l'espace qui s'en charge, faute
 *    d'en-tête (src/app/admin/layout.tsx).
 *
 * L'en-tête est posé à partir de zéro sur une copie des en-têtes entrants,
 * et le cas `/admin` direct commence par le SUPPRIMER : sans cette ligne,
 * un client qui enverrait lui-même `x-cm-espace-admin` rouvrirait la porte
 * qu'on vient de fermer.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === CHEMIN_ESPACE_ADMIN || pathname.startsWith(`${CHEMIN_ESPACE_ADMIN}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = `${CHEMIN_INTERNE_ADMIN}${pathname.slice(CHEMIN_ESPACE_ADMIN.length)}`;
    const entetes = new Headers(request.headers);
    entetes.set(EN_TETE_ESPACE_ADMIN, "1");
    return NextResponse.rewrite(url, { request: { headers: entetes } });
  }

  if (pathname === CHEMIN_INTERNE_ADMIN || pathname.startsWith(`${CHEMIN_INTERNE_ADMIN}/`)) {
    const entetes = new Headers(request.headers);
    entetes.delete(EN_TETE_ESPACE_ADMIN);
    return NextResponse.next({ request: { headers: entetes } });
  }

  return NextResponse.next();
}

// Le motif est écrit en dur, pas construit à partir du chemin configuré :
// `matcher` doit être analysable statiquement à la compilation. C'est
// pourquoi l'aiguillage lui-même se fait dans la fonction ci-dessus, sur
// toutes les pages, plutôt que par un filtrage en amont.
//
// Exclusions : les fichiers statiques, l'optimisation d'images et `/api`
// (réécrit vers le backend distant par next.config.ts — et le proxy
// s'exécute AVANT ces réécritures, cf. l'ordre d'exécution documenté).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
