"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { ConflitDetecte } from "@/lib/types";
import { ConflitGraviteBadge } from "@/components/ui/StatusBadge";

// FR-CONF-05/06/07 : chaque conflit est catégorisé par gravité et reste
// visible même s'il n'empêche pas techniquement l'enregistrement (§4.3 cahier
// des charges). "Corriger" / "Modifier salle" ouvrent le créneau concerné
// dans le formulaire d'édition ; "Ignorer" / "Valider malgré tout" masquent
// la carte localement (la dérogation elle-même se fait dans le formulaire,
// avec motif obligatoire — FR-CONF-08).
export function ConflictPanel({
  conflits,
  onCorriger,
}: {
  conflits: ConflitDetecte[];
  onCorriger: (creneauId: string) => void;
}) {
  const [masques, setMasques] = useState<Set<string>>(new Set());
  const visibles = conflits.filter((c) => !masques.has(c.id));

  function masquer(id: string) {
    setMasques((prev) => new Set(prev).add(id));
  }

  return (
    <div className="h-fit rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-status-danger" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text">Alertes de Conflit</h2>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-status-danger text-xs font-semibold text-white">
          {visibles.length}
        </span>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-text-muted">Aucun conflit détecté pour la période affichée.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibles.map((conflit) => (
            <div
              key={conflit.id}
              className={`rounded-lg border p-3 ${
                conflit.gravite === "bloquant"
                  ? "border-status-danger/40 bg-status-danger-bg/60"
                  : "border-status-warning/40 bg-status-warning-bg/60"
              }`}
            >
              <ConflitGraviteBadge gravite={conflit.gravite} />
              <p className="mt-2 text-sm font-semibold text-text">{conflit.titre}</p>
              <p className="mt-1 text-sm text-text-muted">{conflit.description}</p>
              <div className="mt-3 flex gap-2 text-sm">
                {conflit.gravite === "bloquant" ? (
                  <>
                    <button onClick={() => masquer(conflit.id)} className="text-text-muted hover:underline">
                      Ignorer
                    </button>
                    <button
                      onClick={() => onCorriger(conflit.creneauxConcernes[0])}
                      className="ml-auto rounded-lg bg-brand px-3 py-1 font-medium text-white hover:bg-brand-hover"
                    >
                      Corriger
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => masquer(conflit.id)}
                      className="rounded-lg border border-border px-3 py-1 font-medium text-text hover:bg-surface-muted"
                    >
                      Valider malgré tout
                    </button>
                    <button
                      onClick={() => onCorriger(conflit.creneauxConcernes[0])}
                      className="ml-auto rounded-lg bg-brand px-3 py-1 font-medium text-white hover:bg-brand-hover"
                    >
                      Modifier salle
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
