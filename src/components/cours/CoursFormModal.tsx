"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { Departement, UniteEnseignement } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { NIVEAUX } from "@/lib/referentiel-options";

// [V3.3] FR-REF-13/26 — un cours porte un niveau choisi dans une liste, et
// est rattaché à un ou plusieurs départements.
//
// Le rattachement multiple n'est pas un raffinement : un cours mutualisé
// (tronc commun, UE d'anglais, statistique de base) est dispensé à plusieurs
// départements à la fois. Avec un rattachement unique, il faudrait ressaisir
// la même fiche autant de fois qu'il y a de départements concernés — donc
// maintenir plusieurs cours pour une seule réalité, et ne jamais pouvoir
// répondre à « quels départements suivent ce cours ? ».
export function CoursFormModal({
  cours,
  onClose,
  onSave,
}: {
  // Renseigné = modification (sert surtout à rattacher un cours existant,
  // les cours antérieurs à la V3.3 n'ayant aucun département).
  cours?: UniteEnseignement | null;
  onClose: () => void;
  onSave: (ue: UniteEnseignement) => void;
}) {
  const modeEdition = Boolean(cours);

  const [departements, setDepartements] = useState<Departement[] | null>(null);
  const [code, setCode] = useState(cours?.code === "—" ? "" : (cours?.code ?? ""));
  const [intitule, setIntitule] = useState(cours?.intitule ?? "");
  const [niveau, setNiveau] = useState<string>(cours?.niveau ?? NIVEAUX[0]);
  const [choisis, setChoisis] = useState<Set<string>>(new Set(cours?.departements.map((d) => d.id) ?? []));
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data) => !annule && setDepartements(data.departements))
      .catch(() => !annule && setDepartements([]));
    return () => {
      annule = true;
    };
  }, []);

  function basculer(id: string) {
    setChoisis((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  async function handleSubmit() {
    if (!intitule.trim()) {
      setErreur("L'intitulé est obligatoire.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    const corps = { code, intitule, niveau, departementIds: [...choisis] };
    const reponse = await apiFetch(modeEdition ? `/cours/${cours!.id}` : "/cours", {
      method: modeEdition ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible d'enregistrer le cours.");
      return;
    }
    onSave(data.ue);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">{modeEdition ? "Modifier le cours" : "Nouveau cours"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="cours-intitule" className="text-sm font-medium text-text">
              Intitulé
            </label>
            <input
              id="cours-intitule"
              type="text"
              value={intitule}
              onChange={(e) => setIntitule(e.target.value)}
              placeholder="ex: Analyse Numérique"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="cours-code" className="text-sm font-medium text-text">
                Code (optionnel)
              </label>
              <input
                id="cours-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex: INFO304"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="cours-niveau" className="text-sm font-medium text-text">
                Niveau
              </label>
              <select
                id="cours-niveau"
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {NIVEAUX.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-text">Départements qui suivent ce cours</span>
            <p className="mt-0.5 text-xs text-text-subtle">
              Cochez-en plusieurs si le cours est mutualisé — inutile de le ressaisir pour chaque département.
            </p>

            {departements === null ? (
              <p className="mt-2 text-sm text-text-muted">Chargement...</p>
            ) : departements.length === 0 ? (
              <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-text-muted">
                Aucun département enregistré pour votre établissement.
              </p>
            ) : (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
                {departements.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => basculer(d.id)}
                    className={`flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-muted ${
                      choisis.has(d.id) ? "bg-brand/10 font-medium text-brand" : "text-text"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        choisis.has(d.id) ? "border-brand bg-brand text-white" : "border-border"
                      }`}
                      aria-hidden="true"
                    >
                      {choisis.has(d.id) ? <Check className="h-3 w-3" /> : null}
                    </span>
                    {d.libelle}
                  </button>
                ))}
              </div>
            )}

            {choisis.size > 1 ? (
              <p className="mt-2 text-xs font-medium text-brand">
                Cours mutualisé — {choisis.size} départements.
              </p>
            ) : null}
            {choisis.size === 0 && departements !== null && departements.length > 0 ? (
              // Même logique que l'effectif à zéro : accepté, mais le dire.
              <p className="mt-2 text-xs text-status-warning">
                Aucun département : le cours restera invisible dans les recherches par département.
              </p>
            ) : null}
          </div>

          {erreur ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={enCours}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {enCours ? "Enregistrement..." : modeEdition ? "Enregistrer" : "Créer le cours"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
