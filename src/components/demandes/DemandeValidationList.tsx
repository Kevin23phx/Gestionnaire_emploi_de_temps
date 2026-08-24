"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { Creneau, DemandeEnseignant } from "@/lib/types";
import { DemandeStatusBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";

const TYPE_LABEL: Record<DemandeEnseignant["type"], string> = {
  absence: "Absence",
  report: "Report",
  permutation: "Permutation",
};

interface ConflitApi {
  type: string;
  gravite: string;
  titre: string;
  description: string;
}

// FR-SIG-02/RM-04 : applique la décision via POST /demandes/:id/decider
// (RequestModule) — une validation "report"/"permutation" peut rouvrir un
// conflit détecté par ConflictEngineModule (ex. la nouvelle plage proposée
// chevauche entretemps un autre cours) : le backend répond alors 409 avec
// la liste des conflits, à confirmer via un motif de dérogation (FR-CONF-07).
export function DemandeValidationList({
  demandesInitiales,
  creneaux,
}: {
  demandesInitiales: DemandeEnseignant[];
  creneaux: Creneau[];
}) {
  const [demandes, setDemandes] = useState(demandesInitiales);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [conflitEnAttente, setConflitEnAttente] = useState<{
    id: string;
    decision: "validee" | "refusee";
    conflits: ConflitApi[];
    motifDerogation: string;
  } | null>(null);

  async function decider(id: string, decision: "validee" | "refusee", motifDerogation?: string) {
    setEnCours(id);
    setErreur(null);
    const reponse = await apiFetch(`/demandes/${id}/decider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, motifDerogation }),
    });
    setEnCours(null);

    if (reponse.status === 409) {
      const data = await reponse.json();
      setConflitEnAttente({ id, decision, conflits: data.conflits ?? [], motifDerogation: "" });
      return;
    }
    if (!reponse.ok) {
      const data = await reponse.json();
      setErreur(data.erreur ?? "Impossible d'appliquer cette décision.");
      return;
    }

    const demandeMaj: DemandeEnseignant = await reponse.json();
    setDemandes((prev) => prev.map((d) => (d.id === id ? demandeMaj : d)));
    setConflitEnAttente(null);
  }

  const enAttente = demandes.filter((d) => d.statut === "en_attente");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text">
          Demandes en attente ({enAttente.length})
        </div>
        {erreur ? (
          <p className="border-b border-border bg-status-danger-bg px-4 py-2 text-sm text-status-danger">
            {erreur}
          </p>
        ) : null}
        {demandes.map((demande) => {
          const creneau = creneaux.find((c) => c.id === demande.creneauConcerneId);
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
                <>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => decider(demande.id, "refusee")}
                      disabled={enCours === demande.id}
                      className="rounded-lg border border-status-danger px-3 py-1.5 text-sm font-medium text-status-danger hover:bg-status-danger-bg disabled:opacity-50"
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => decider(demande.id, "validee")}
                      disabled={enCours === demande.id}
                      className="rounded-lg bg-status-success px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {enCours === demande.id ? "..." : "Approuver"}
                    </button>
                  </div>

                  {conflitEnAttente && conflitEnAttente.id === demande.id ? (
                    <div className="mt-3 rounded-lg border border-status-danger/40 bg-status-danger-bg/40 p-3">
                      <p className="text-xs font-medium text-text">
                        Conflit détecté en appliquant cette décision :
                      </p>
                      {conflitEnAttente.conflits.map((c, i) => (
                        <p key={i} className="mt-1 text-xs text-text-muted">
                          {c.titre} — {c.description}
                        </p>
                      ))}
                      <input
                        type="text"
                        value={conflitEnAttente.motifDerogation}
                        onChange={(e) =>
                          setConflitEnAttente((prev) => (prev ? { ...prev, motifDerogation: e.target.value } : prev))
                        }
                        placeholder="Motif de dérogation (obligatoire pour continuer)"
                        className="mt-2 w-full rounded-lg border border-border px-2 py-1.5 text-xs"
                      />
                      <button
                        onClick={() =>
                          conflitEnAttente.motifDerogation.trim() &&
                          decider(conflitEnAttente.id, conflitEnAttente.decision, conflitEnAttente.motifDerogation.trim())
                        }
                        disabled={!conflitEnAttente.motifDerogation.trim()}
                        className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                      >
                        Confirmer malgré le conflit
                      </button>
                    </div>
                  ) : null}
                </>
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
          {conflitEnAttente
            ? "Un conflit a été détecté — voir le détail ci-contre."
            : "Aucun conflit détecté pour la demande sélectionnée."}
        </p>
      </div>
    </div>
  );
}
