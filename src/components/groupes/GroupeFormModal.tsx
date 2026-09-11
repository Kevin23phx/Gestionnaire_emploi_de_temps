"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Departement, Groupe } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { AUTRE, NIVEAUX, anneesAcademiques } from "@/lib/referentiel-options";

// [V3.1] FR-REF-12/13 — département, niveau et année académique se
// SÉLECTIONNENT au lieu de se saisir, et l'effectif est un simple nombre.
//
// Deux changements liés :
//
// 1. Les listes déroulantes évitent les variantes d'écriture d'un même
//    département (« Informatique » / « informatique » / « INFO »), qui
//    apparaîtraient comme trois départements distincts dans la cascade
//    publique (FR-PUB-02).
//
//    [V3.2] Les départements viennent désormais du RÉFÉRENTIEL OFFICIEL de
//    l'UJKZ (53 entrées, GET /departements), et non plus des groupes déjà
//    créés. La différence est de fond : une liste déduite des groupes ne
//    peut que se dégrader — chaque faute de frappe y devient un département
//    de plus — alors qu'un référentiel s'enrichit. L'option « + Autre »
//    subsiste et **enregistre** le nouveau département, qui sera proposé
//    aux créations suivantes (FR-REF-21).
//
// 2. L'effectif est saisi directement. Il était auparavant dérivé du nombre
//    d'étudiants importés — un travail de saisie considérable pour une
//    valeur dont le système n'utilise que le nombre, comparé à la capacité
//    d'une salle (RM-02). Contrepartie assumée : le système ne peut plus le
//    vérifier, il vaut ce que le Gestionnaire a saisi.
export function GroupeFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (groupe: Groupe) => void;
}) {
  const annees = anneesAcademiques();

  const [departements, setDepartements] = useState<Departement[] | null>(null);
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [departementLibre, setDepartementLibre] = useState("");
  const [niveau, setNiveau] = useState<string>(NIVEAUX[0]);
  // L'année en cours est au milieu de la liste (précédente, courante,
  // suivante) : c'est le choix juste dans l'immense majorité des cas.
  const [anneeAcademique, setAnneeAcademique] = useState(annees[1]);
  const [effectif, setEffectif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data: { departements: Departement[] }) => {
        if (annule) return;
        setDepartements(data.departements);
        // Si l'établissement n'a encore aucun département, on ouvre
        // directement sur la saisie libre plutôt que sur une liste vide.
        setDepartement(data.departements[0]?.libelle ?? AUTRE);
      })
      .catch(() => {
        if (!annule) setDepartements([]);
      });
    return () => {
      annule = true;
    };
  }, []);

  const departementRetenu = departement === AUTRE ? departementLibre.trim() : departement;

  async function handleSubmit() {
    if (!nom.trim() || !departementRetenu) {
      setErreur("Le nom du groupe et le département sont obligatoires.");
      return;
    }
    const nombre = Number(effectif);
    if (effectif !== "" && (!Number.isInteger(nombre) || nombre < 0)) {
      setErreur("L'effectif doit être un nombre entier positif.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    // FR-REF-21 : un département saisi librement rejoint le référentiel de
    // l'établissement, pour être proposé aux créations suivantes. Un échec
    // ici (doublon de casse, par exemple) ne doit pas empêcher la création
    // du groupe lui-même — le libellé est de toute façon correct.
    if (departement === AUTRE && departementRetenu) {
      await apiFetch("/departements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: departementRetenu }),
      }).catch(() => {});
    }

    const reponse = await apiFetch("/groupes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom,
        departement: departementRetenu,
        niveau,
        anneeAcademique,
        effectif: effectif === "" ? 0 : nombre,
      }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le groupe.");
      return;
    }

    onSave(data.groupe);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouveau groupe</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="groupe-nom" className="text-sm font-medium text-text">
              Nom du groupe
            </label>
            <input
              id="groupe-nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: L3 INFO - Groupe B"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="groupe-departement" className="text-sm font-medium text-text">
              Département
            </label>
            <select
              id="groupe-departement"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              disabled={departements === null}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              {departements === null ? <option value="">Chargement...</option> : null}
              {(departements ?? []).map((d) => (
                <option key={d.id} value={d.libelle}>
                  {d.libelle}
                </option>
              ))}
              <option value={AUTRE}>+ Autre département...</option>
            </select>
            {departement === AUTRE ? (
              <>
                <input
                  type="text"
                  value={departementLibre}
                  onChange={(e) => setDepartementLibre(e.target.value)}
                  placeholder="Nom du nouveau département"
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-text-subtle">
                  Il sera ajouté aux départements de votre établissement et proposé la prochaine fois.
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-text-subtle">
                Départements officiels de votre établissement.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="groupe-niveau" className="text-sm font-medium text-text">
                Niveau
              </label>
              <select
                id="groupe-niveau"
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

            <div className="flex-1">
              <label htmlFor="groupe-annee" className="text-sm font-medium text-text">
                Année académique
              </label>
              <select
                id="groupe-annee"
                value={anneeAcademique}
                onChange={(e) => setAnneeAcademique(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {annees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="groupe-effectif" className="text-sm font-medium text-text">
              Nombre d&apos;étudiants
            </label>
            <input
              id="groupe-effectif"
              type="number"
              min={0}
              value={effectif}
              onChange={(e) => setEffectif(e.target.value)}
              placeholder="ex: 120"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-subtle">
              Sert à vous alerter quand une salle est trop petite pour le groupe. Modifiable à tout moment.
            </p>
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
              {enCours ? "Création..." : "Créer le groupe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
