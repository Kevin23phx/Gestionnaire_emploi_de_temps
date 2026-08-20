"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckSquare, Square } from "lucide-react";
import type { ConflitDetecte, Creneau, Salle } from "@/lib/types";
import { ConflitGraviteBadge } from "@/components/ui/StatusBadge";

// FR-CONF-05/06/07 : chaque conflit est catégorisé par gravité et reste
// visible même s'il n'empêche pas techniquement l'enregistrement (§4.3 cahier
// des charges). "Corriger" / "Modifier salle" ouvrent le créneau concerné
// dans le formulaire d'édition ; "Ignorer" / "Valider malgré tout" masquent
// la carte localement (la dérogation elle-même se fait dans le formulaire,
// avec motif obligatoire — FR-CONF-08).
//
// Correction groupée (retour utilisateur du 2026-08-18) : un seul cours créé
// sur plusieurs jours dans une salle trop petite génère un avertissement de
// capacité PAR séance (FR-CONF-04 s'applique séance par séance) — les
// corriger une à une revient à répéter 5 fois la même action. Comme toutes
// les séances d'un même conflit de capacité partagent le même groupe/salle,
// les réaffecter en une fois vers une salle assez grande est une opération
// sûre (chaque avertissement de capacité ne concerne qu'un seul créneau,
// contrairement aux conflits bloquants qui en lient deux — d'où la
// correction groupée réservée au type "capacite"). Après application, le
// recalcul des conflits (côté page parente) fait disparaître celles qui sont
// résolues automatiquement.
export function ConflictPanel({
  conflits,
  creneaux,
  salles,
  onCorriger,
  onCorrigerEnMasse,
}: {
  conflits: ConflitDetecte[];
  creneaux: Creneau[];
  salles: Salle[];
  onCorriger: (creneauId: string) => void;
  onCorrigerEnMasse: (creneauxModifies: Creneau[], motif: string) => void;
}) {
  const [masques, setMasques] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [salleCibleId, setSalleCibleId] = useState("");
  const [motifMasse, setMotifMasse] = useState("");
  const [erreurMasse, setErreurMasse] = useState<string | null>(null);

  const visibles = conflits.filter((c) => !masques.has(c.id));
  const selectionnes = visibles.filter((c) => selection.has(c.id));

  const creneauById = useMemo(() => new Map(creneaux.map((c) => [c.id, c])), [creneaux]);

  const toutesCapacite = selectionnes.length > 0 && selectionnes.every((c) => c.type === "capacite");

  // Les créneaux concernés par la sélection (dédupliqués), pour calculer la
  // capacité minimale requise et construire les résultats à enregistrer.
  const creneauxSelectionnes = useMemo(() => {
    const ids = new Set(selectionnes.flatMap((c) => c.creneauxConcernes));
    return [...ids].map((id) => creneauById.get(id)).filter((c): c is Creneau => c !== undefined);
  }, [selectionnes, creneauById]);

  const effectifMax = Math.max(0, ...creneauxSelectionnes.map((c) => c.groupe.effectif));
  const sallesEligibles = salles.filter((s) => s.capacite >= effectifMax);

  function masquer(id: string) {
    setMasques((prev) => new Set(prev).add(id));
    setSelection((prev) => {
      const suivant = new Set(prev);
      suivant.delete(id);
      return suivant;
    });
  }

  function masquerSelection() {
    setMasques((prev) => {
      const suivant = new Set(prev);
      for (const c of selectionnes) suivant.add(c.id);
      return suivant;
    });
    setSelection(new Set());
  }

  function toggleSelection(id: string) {
    setErreurMasse(null);
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function toutSelectionner() {
    setErreurMasse(null);
    setSelection(new Set(visibles.map((c) => c.id)));
  }

  function viderSelection() {
    setSelection(new Set());
    setSalleCibleId("");
    setMotifMasse("");
    setErreurMasse(null);
  }

  // Raccourci pour sortir d'une sélection mixte (retour utilisateur du
  // 2026-08-18 : "Tout sélectionner" attrape aussi les conflits bloquants,
  // ce qui masque silencieusement le formulaire de correction groupée sans
  // rien expliquer — cette option ramène la sélection au sous-ensemble
  // corrigeable en un clic plutôt que de décocher les cartes une à une).
  function neGarderQueLaCapacite() {
    setErreurMasse(null);
    setSelection(new Set(selectionnes.filter((c) => c.type === "capacite").map((c) => c.id)));
  }

  function appliquerCorrectionMasse() {
    if (!toutesCapacite) {
      setErreurMasse(
        "La sélection contient un conflit bloquant : la correction groupée ne s'applique qu'aux avertissements de capacité."
      );
      return;
    }
    if (!salleCibleId) {
      setErreurMasse("Choisissez une salle de destination.");
      return;
    }
    if (!motifMasse.trim()) {
      setErreurMasse("Le motif de la correction est obligatoire.");
      return;
    }
    const nouvelleSalle = salles.find((s) => s.id === salleCibleId);
    if (!nouvelleSalle || creneauxSelectionnes.length === 0) return;

    setErreurMasse(null);
    const resultats = creneauxSelectionnes.map((c) => ({
      ...c,
      salle: nouvelleSalle,
      statut: "modifie" as const,
      motif: motifMasse.trim(),
    }));
    onCorrigerEnMasse(resultats, motifMasse.trim());
    viderSelection();
  }

  return (
    <div className="flex h-fit max-h-[calc(100vh-4rem)] flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-status-danger" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text">Alertes de Conflit</h2>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-status-danger text-xs font-semibold text-white">
          {visibles.length}
        </span>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-text-muted">Aucun conflit détecté pour la période affichée.</p>
      ) : (
        <>
          <div className="mb-2 flex shrink-0 items-center gap-3 text-xs">
            <button
              onClick={selection.size === visibles.length ? viderSelection : toutSelectionner}
              className="flex items-center gap-1.5 font-medium text-brand hover:underline"
            >
              {selection.size === visibles.length ? (
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {selection.size === visibles.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
            {selection.size > 0 ? (
              <span className="text-text-muted">{selection.size} sélectionné(s)</span>
            ) : null}
          </div>

          {selection.size > 0 ? (
            <div className="mb-3 shrink-0 rounded-lg border border-brand/30 bg-brand/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-text">
                  {selection.size} avertissement(s) sélectionné(s)
                </p>
                <button onClick={masquerSelection} className="text-xs text-text-muted hover:underline">
                  Ignorer la sélection
                </button>
              </div>

              {toutesCapacite ? (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-xs text-text-muted">
                    Réaffecter les {creneauxSelectionnes.length} séance(s) concernée(s) vers une
                    nouvelle salle, en une seule action :
                  </p>
                  <select
                    value={salleCibleId}
                    onChange={(e) => setSalleCibleId(e.target.value)}
                    className="rounded-lg border border-border px-2 py-1.5 text-xs"
                  >
                    <option value="">Choisir une salle (≥ {effectifMax} places)</option>
                    {sallesEligibles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom} — {s.capacite} places
                      </option>
                    ))}
                  </select>
                  {sallesEligibles.length === 0 ? (
                    <p className="text-xs text-status-danger">
                      Aucune salle du campus n&apos;a une capacité suffisante pour {effectifMax}{" "}
                      personnes.
                    </p>
                  ) : null}
                  <input
                    type="text"
                    value={motifMasse}
                    onChange={(e) => setMotifMasse(e.target.value)}
                    placeholder="Motif de la correction (obligatoire)"
                    className="rounded-lg border border-border px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={appliquerCorrectionMasse}
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                  >
                    Appliquer à la sélection
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-xs text-text-muted">
                    La sélection contient un conflit bloquant : la correction groupée ne
                    s&apos;applique qu&apos;aux avertissements de capacité (un conflit bloquant lie
                    deux créneaux distincts, il n&apos;y a pas de correction identique applicable
                    aux deux à la fois — utilisez « Corriger » sur cette carte).
                  </p>
                  {selectionnes.some((c) => c.type === "capacite") ? (
                    <button
                      onClick={neGarderQueLaCapacite}
                      className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted"
                    >
                      Ne garder que les avertissements de capacité
                    </button>
                  ) : null}
                </div>
              )}

              {erreurMasse ? (
                <p className="mt-2 rounded-lg bg-status-danger-bg px-2 py-1.5 text-xs text-status-danger">
                  {erreurMasse}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 overflow-y-auto">
            {visibles.map((conflit) => (
              <div
                key={conflit.id}
                className={`flex gap-2 rounded-lg border p-3 ${
                  conflit.gravite === "bloquant"
                    ? "border-status-danger/40 bg-status-danger-bg/60"
                    : "border-status-warning/40 bg-status-warning-bg/60"
                } ${selection.has(conflit.id) ? "ring-2 ring-brand" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selection.has(conflit.id)}
                  onChange={() => toggleSelection(conflit.id)}
                  aria-label={`Sélectionner l'alerte : ${conflit.titre}`}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand"
                />
                <div className="min-w-0 flex-1">
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
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
