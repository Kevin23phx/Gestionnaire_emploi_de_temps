"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { Creneau, DemandeEnseignant } from "@/lib/types";
import { DemandeStatusBadge } from "@/components/ui/StatusBadge";

const TYPE_LABEL: Record<DemandeEnseignant["type"], string> = {
  absence: "Absence",
  report: "Report",
  permutation: "Permutation",
};

// FR-SIG-02 : la décision reste locale à cet écran (mock) — à brancher sur
// PATCH /demandes/:id une fois l'API disponible (RequestModule, cf. 04_Exigence_Architecture).
export function DemandeValidationList({
  demandesInitiales,
  creneaux,
}: {
  demandesInitiales: DemandeEnseignant[];
  creneaux: Creneau[];
}) {
  const [demandes, setDemandes] = useState(demandesInitiales);

  function decider(id: string, statut: "validee" | "refusee") {
    setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut } : d)));
  }

  const enAttente = demandes.filter((d) => d.statut === "en_attente");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text">
          Demandes en attente ({enAttente.length})
        </div>
        {demandes.map((demande) => {
          const creneau = creneaux.find((c) => c.id === demande.creneauConcerne);
          return (
            <div key={demande.id} className="border-b border-border px-4 py-4 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text">
                  {demande.enseignant.prenom} {demande.enseignant.nom}
                </span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
                  {TYPE_LABEL[demande.type]}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {creneau?.ue.intitule} — {creneau?.jour} {creneau?.heureDebut}-{creneau?.heureFin}
              </p>
              <p className="mt-1 text-xs text-text-subtle">Motif : {demande.motif}</p>

              {demande.statut === "en_attente" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => decider(demande.id, "refusee")}
                    className="rounded-lg border border-status-danger px-3 py-1.5 text-sm font-medium text-status-danger hover:bg-status-danger-bg"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => decider(demande.id, "validee")}
                    className="rounded-lg bg-status-success px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                  >
                    Approuver
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <DemandeStatusBadge statut={demande.statut} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-fit rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Aperçu de l&apos;impact
        </div>
        <p className="rounded-lg bg-status-info-bg px-3 py-2 text-sm text-status-info">
          Aucun conflit détecté pour la demande sélectionnée.
        </p>
      </div>
    </div>
  );
}
