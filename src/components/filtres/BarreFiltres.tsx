"use client";

import { RefreshCw, Search, X } from "lucide-react";

// [V3] FR-FILT-01 — la barre de recherche et de filtres, partagée par tous
// les écrans de référentiel. Un composant unique plutôt qu'une barre par
// écran : c'est ce qui garantit qu'un Gestionnaire retrouve le même geste
// partout, et que le compteur de résultats est toujours présenté de la même
// façon.

export interface Filtre {
  cle: string;
  label: string;
  options: string[];
}

export function BarreFiltres({
  placeholder,
  filtres = [],
  valeur,
  definir,
  reinitialiser,
  actifs,
  resultats,
  total,
  extra,
  manuel,
  onActualiser,
  peutActualiser = true,
}: {
  placeholder: string;
  filtres?: Filtre[];
  valeur: (cle: string) => string;
  definir: (cle: string, valeur: string) => void;
  reinitialiser: () => void;
  actifs: number;
  resultats: number;
  total: number;
  extra?: React.ReactNode;
  // [2026-09] Mode "manuel" (FR-FILT gestionnaire) : `valeur`/`definir`
  // reçus ici sont alors liés à un brouillon local (cf. useFiltresManuel),
  // jamais directement à l'URL — c'est le clic sur "Actualiser" qui
  // déclenche le chargement, pas la saisie.
  manuel?: boolean;
  onActualiser?: () => void;
  // [2026-09] Retour des gestionnaires : sur certains écrans, Actualiser ne
  // doit pas être cliquable tant que les filtres obligatoires de la page ne
  // sont pas tous remplis — la page appelante décide lesquels le sont et
  // passe le résultat ici (true par défaut : pas de filtre obligatoire).
  peutActualiser?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={valeur("q")}
            onChange={(e) => definir("q", e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-subtle"
          />
        </div>

        {filtres.map((filtre) => (
          <label key={filtre.cle} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">{filtre.label}</span>
            <select
              value={valeur(filtre.cle)}
              onChange={(e) => definir(filtre.cle, e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            >
              <option value="">Tous</option>
              {filtre.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}

        {extra}

        {manuel ? (
          <button
            onClick={onActualiser}
            disabled={!peutActualiser}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Actualiser
          </button>
        ) : null}

        {actifs > 0 ? (
          <button
            onClick={reinitialiser}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-muted"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Effacer
          </button>
        ) : null}
      </div>

      {/* Le compteur est affiché dès qu'un filtre est actif : sans lui, une
          liste courte ne se distingue pas d'un filtre trop restrictif. */}
      {actifs > 0 ? (
        <p className="text-xs text-text-muted">
          {resultats} résultat{resultats > 1 ? "s" : ""} sur {total}
        </p>
      ) : null}
    </div>
  );
}
