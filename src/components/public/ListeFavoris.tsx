"use client";

import Link from "next/link";
import { Star, X } from "lucide-react";
import { retirerFavori, useFavoris } from "@/lib/favoris";

// [V3] FR-PUB-04 — les favoris du visiteur, en tête de la page d'accueil.
//
// Lus via `useFavoris` (useSyncExternalStore) : `localStorage` n'existe pas
// pendant le rendu serveur de Next, et le lire naïvement ferait diverger le
// HTML serveur du HTML client. Voir lib/favoris.ts pour le détail.
export function ListeFavoris() {
  const favoris = useFavoris();

  if (favoris.length === 0) return null;

  return (
    <section className="mb-10 w-full max-w-2xl">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text">
        <Star className="h-4 w-4 fill-status-warning text-status-warning" aria-hidden="true" />
        Vos programmes
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {favoris.map((f) => (
          <div
            key={f.groupeId}
            className="group flex items-center gap-2 rounded-xl border border-border bg-surface pr-2 transition-colors hover:border-brand"
          >
            <Link href={`/programme/${f.groupeId}`} className="min-w-0 flex-1 p-4">
              <span className="block truncate font-semibold text-text">{f.nom}</span>
              <span className="block truncate text-xs text-text-muted">
                {f.ufrSigle} · {f.departement} · {f.niveau}
                {f.anneeAcademique ? ` · ${f.anneeAcademique}` : ""}
              </span>
            </Link>
            <button
              onClick={() => retirerFavori(f.groupeId)}
              aria-label={`Retirer ${f.nom} des favoris`}
              className="rounded-lg p-2 text-text-subtle hover:bg-surface-muted hover:text-status-danger"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
