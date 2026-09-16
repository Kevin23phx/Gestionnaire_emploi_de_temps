"use client";

import { useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { Groupe } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { NIVEAU_SUIVANT, anneeAcademiqueSuivante } from "@/lib/referentiel-options";

/**
 * [V6] FR-REF-12 — passage à l'année supérieure. Documenté depuis la V2
 * ("une promotion se fait en créant un nouveau Groupe, jamais en modifiant
 * celui-ci sur place") mais jamais implémenté : le Gestionnaire ressaisissait
 * chaque groupe de zéro à chaque rentrée.
 *
 * Reste une décision humaine, jamais automatique — comme un jury de fin
 * d'année : le Système propose le niveau suivant et préremplit l'effectif
 * avec la valeur actuelle, mais c'est au Gestionnaire de la corriger.
 * L'effectif diminue naturellement d'une année sur l'autre (abandons,
 * redoublements) et rien ne permet au Système de connaître le nouveau
 * chiffre à sa place — la ligne reste éditable, jamais appliquée en silence.
 *
 * Une case à décocher par ligne : la campagne ne doit pas forcer la main
 * sur un groupe pas encore prêt (résultats du jury pas encore délibérés,
 * par exemple).
 */

function suggererNom(nomActuel: string, niveauActuel: string, niveauCible: string): string {
  const motif = new RegExp(`\\b${niveauActuel}\\b`);
  return motif.test(nomActuel) ? nomActuel.replace(motif, niveauCible) : `${nomActuel} (${niveauCible})`;
}

interface Ligne {
  groupe: Groupe;
  inclure: boolean;
  nom: string;
  effectif: string;
}

export function PassagePromotionModal({
  groupes,
  onClose,
  onPromu,
}: {
  groupes: Groupe[];
  onClose: () => void;
  onPromu: () => void;
}) {
  // Groupes qui PEUVENT être promus : niveau non terminal, pas déjà promus.
  const eligibles = useMemo(
    () => groupes.filter((g) => NIVEAU_SUIVANT[g.niveau] && !g.aDejaEteSuccede),
    [groupes]
  );
  const anneesDisponibles = useMemo(
    () => Array.from(new Set(eligibles.map((g) => g.anneeAcademique))).sort(),
    [eligibles]
  );

  const [anneeSource, setAnneeSource] = useState(anneesDisponibles.at(-1) ?? "");
  const anneeCible = anneeSource ? anneeAcademiqueSuivante(anneeSource) : "";

  const groupesDeLAnnee = useMemo(
    () => eligibles.filter((g) => g.anneeAcademique === anneeSource),
    [eligibles, anneeSource]
  );

  const [lignes, setLignes] = useState<Ligne[]>(() =>
    groupesDeLAnnee.map((g) => ({
      groupe: g,
      inclure: true,
      nom: suggererNom(g.nom, g.niveau, NIVEAU_SUIVANT[g.niveau]),
      effectif: String(g.effectif),
    }))
  );

  function changerAnneeSource(annee: string) {
    setAnneeSource(annee);
    const suivants = eligibles.filter((g) => g.anneeAcademique === annee);
    setLignes(
      suivants.map((g) => ({
        groupe: g,
        inclure: true,
        nom: suggererNom(g.nom, g.niveau, NIVEAU_SUIVANT[g.niveau]),
        effectif: String(g.effectif),
      }))
    );
  }

  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const selectionnees = lignes.filter((l) => l.inclure);

  async function handleValider() {
    if (selectionnees.length === 0) {
      setErreur("Sélectionnez au moins un groupe.");
      return;
    }
    for (const ligne of selectionnees) {
      if (!ligne.nom.trim()) {
        setErreur(`Le nom du groupe issu de « ${ligne.groupe.nom} » est obligatoire.`);
        return;
      }
      const nombre = Number(ligne.effectif);
      if (!Number.isInteger(nombre) || nombre < 0) {
        setErreur(`L'effectif de « ${ligne.nom} » doit être un nombre entier positif.`);
        return;
      }
    }

    setErreur(null);
    setEnCours(true);
    const reponse = await apiFetch("/groupes/passage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anneeAcademiqueCible: anneeCible,
        groupes: selectionnees.map((l) => ({ id: l.groupe.id, nom: l.nom.trim(), effectif: Number(l.effectif) })),
      }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible d'effectuer le passage.");
      return;
    }
    onPromu();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Progression des promotions</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {anneesDisponibles.length === 0 ? (
          <p className="text-sm text-text-muted">
            Aucun groupe éligible à un passage. Les groupes de niveau L3 ou M2 sont en fin de cycle — ils ne
            passent pas à un niveau supérieur, et un groupe déjà promu n&apos;apparaît plus ici.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label htmlFor="passage-annee-source" className="text-sm font-medium text-text">
                  Année académique source
                </label>
                <select
                  id="passage-annee-source"
                  value={anneeSource}
                  onChange={(e) => changerAnneeSource(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  {anneesDisponibles.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />
              <div>
                <span className="text-sm font-medium text-text">Année cible</span>
                <p className="mt-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text-muted">
                  {anneeCible}
                </p>
              </div>
            </div>

            <p className="text-xs text-text-subtle">
              Chaque ligne crée un NOUVEAU groupe pour {anneeCible} — le groupe de {anneeSource} reste inchangé
              dans le référentiel. Vérifiez le nom et corrigez l&apos;effectif : il ne diminue jamais tout seul.
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="bg-surface-muted text-xs uppercase tracking-wide text-text-subtle">
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">Inclure</span>
                    </th>
                    <th className="px-3 py-2 font-medium">Parcours</th>
                    <th className="px-3 py-2 font-medium">Nouveau nom</th>
                    <th className="px-3 py-2 font-medium">Effectif</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, index) => (
                    <tr key={ligne.groupe.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={ligne.inclure}
                          onChange={(e) =>
                            setLignes((prev) =>
                              prev.map((l, i) => (i === index ? { ...l, inclure: e.target.checked } : l))
                            )
                          }
                          aria-label={`Inclure ${ligne.groupe.nom}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-muted">
                        {ligne.groupe.niveau} → {NIVEAU_SUIVANT[ligne.groupe.niveau]}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={ligne.nom}
                          disabled={!ligne.inclure}
                          onChange={(e) =>
                            setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, nom: e.target.value } : l)))
                          }
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={ligne.effectif}
                          disabled={!ligne.inclure}
                          onChange={(e) =>
                            setLignes((prev) =>
                              prev.map((l, i) => (i === index ? { ...l, effectif: e.target.value } : l))
                            )
                          }
                          className="w-24 rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {erreur ? (
              <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleValider}
                disabled={enCours || selectionnees.length === 0}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {enCours ? "Passage en cours..." : `Confirmer le passage (${selectionnees.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
