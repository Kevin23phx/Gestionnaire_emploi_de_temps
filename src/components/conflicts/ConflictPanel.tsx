import { AlertTriangle } from "lucide-react";
import type { ConflitDetecte } from "@/lib/types";
import { ConflitGraviteBadge } from "@/components/ui/StatusBadge";

// FR-CONF-05/06/07 : chaque conflit est catégorisé par gravité et reste
// visible même s'il n'empêche pas techniquement l'enregistrement (§4.3 cahier
// des charges). Les actions ci-dessous sont volontairement non câblées tant
// que l'écran d'édition de créneau (FR-EDT-02/03) n'existe pas.
export function ConflictPanel({ conflits }: { conflits: ConflitDetecte[] }) {
  return (
    <div className="h-fit rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-status-danger" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text">Alertes de Conflit</h2>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-status-danger text-xs font-semibold text-white">
          {conflits.length}
        </span>
      </div>

      {conflits.length === 0 ? (
        <p className="text-sm text-text-muted">Aucun conflit détecté pour la période affichée.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {conflits.map((conflit) => (
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
                    <button className="text-text-muted hover:underline">Ignorer</button>
                    <button className="ml-auto rounded-lg bg-brand px-3 py-1 font-medium text-white hover:bg-brand-hover">
                      Corriger
                    </button>
                  </>
                ) : (
                  <>
                    <button className="rounded-lg border border-border px-3 py-1 font-medium text-text hover:bg-surface-muted">
                      Valider malgré tout
                    </button>
                    <button className="ml-auto rounded-lg bg-brand px-3 py-1 font-medium text-white hover:bg-brand-hover">
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
