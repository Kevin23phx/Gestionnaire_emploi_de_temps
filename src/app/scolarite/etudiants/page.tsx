"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { Etudiant, Groupe } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// FR-REF-11/14 : filtrage du référentiel étudiants par année académique et
// par filière ("département" dans le vocabulaire du porteur de projet) — le
// périmètre UFR lui-même est déjà appliqué côté API (EtudiantsService.list),
// jamais reconstruit ici. Retour d'usage 2026-08-27 : l'écran n'affiche
// AUCUNE liste tant que les deux filtres n'ont pas été renseignés — jamais
// un référentiel complet par défaut.
export default function EtudiantsPage() {
  const [etudiants, setEtudiants] = useState<Etudiant[] | null>(null);
  const [anneeAcademique, setAnneeAcademique] = useState("");
  const [filiere, setFiliere] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [groupeCible, setGroupeCible] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const filtresComplets = Boolean(anneeAcademique.trim() && filiere.trim());

  useEffect(() => {
    if (!filtresComplets) return;
    const params = new URLSearchParams({ anneeAcademique: anneeAcademique.trim(), filiere: filiere.trim() });
    apiFetch(`/etudiants?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEtudiants(data.etudiants);
        setSelection(new Set());
      });
  }, [filtresComplets, anneeAcademique, filiere]);

  // Ne montre jamais un résultat périmé d'une recherche précédente pendant
  // qu'un des deux filtres est de nouveau incomplet (ex. l'utilisateur vide
  // le champ filière) — dérivé au rendu plutôt qu'en resynchronisant l'état
  // dans l'effet ci-dessus.
  const etudiantsAffiches = filtresComplets ? etudiants : null;

  useEffect(() => {
    apiFetch("/groupes")
      .then((r) => r.json())
      .then((data) => setGroupes(data.groupes));
  }, []);

  function basculer(id: string) {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  // FR-REF-15 : le mécanisme de promotion — la cohorte "L1 2025-2026"
  // devient "L2 2026-2027" en étant déplacée vers un groupe qui porte déjà
  // ce niveau/cette année (créé au préalable dans l'écran Groupes). Le
  // niveau/filière de chaque étudiant se synchronise automatiquement sur
  // ceux du groupe de destination (voir EtudiantsService.affecter).
  async function deplacerVersGroupe() {
    if (!groupeCible || selection.size === 0) return;
    setErreur(null);
    setEnCours(true);
    const reponse = await apiFetch("/etudiants/affecter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etudiantIds: [...selection], groupeId: groupeCible }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de déplacer ces étudiants.");
      return;
    }

    const nomGroupe = groupes?.find((g) => g.id === groupeCible)?.nom ?? "le groupe choisi";
    setConfirmation(`${selection.size} étudiant(s) déplacé(s) vers ${nomGroupe}.`);
    setSelection(new Set());
    setGroupeCible("");
    // Les étudiants déplacés ne correspondent probablement plus aux filtres
    // affichés (niveau/filière ont changé) — on les retire de la liste
    // plutôt que de la recharger silencieusement.
    setEtudiants((prev) => (prev ?? []).filter((e) => !selection.has(e.id)));
    setTimeout(() => setConfirmation(null), 6000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Étudiants</h1>
        <p className="text-sm text-text-muted">
          Référentiel des étudiants de votre UFR — sélectionnez une année académique et une filière pour afficher la
          liste.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-text">Année académique</label>
          <input
            type="text"
            value={anneeAcademique}
            onChange={(e) => setAnneeAcademique(e.target.value)}
            placeholder="ex: 2025-2026"
            className="mt-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text">Filière (département)</label>
          <input
            type="text"
            value={filiere}
            onChange={(e) => setFiliere(e.target.value)}
            placeholder="ex: Informatique"
            className="mt-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        {anneeAcademique || filiere ? (
          <button
            onClick={() => {
              setAnneeAcademique("");
              setFiliere("");
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface-muted"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {confirmation ? (
        <p className="mb-4 rounded-lg bg-status-success-bg px-3 py-2 text-sm text-status-success">{confirmation}</p>
      ) : null}
      {erreur ? (
        <p className="mb-4 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
      ) : null}

      {!filtresComplets ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Renseignez l&apos;année académique et la filière ci-dessus pour afficher la liste des étudiants.
        </div>
      ) : (
        <>
          {selection.size > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2">
              <span className="text-sm text-text">{selection.size} sélectionné(s)</span>
              <select
                value={groupeCible}
                onChange={(e) => setGroupeCible(e.target.value)}
                className="rounded-lg border border-border px-2 py-1.5 text-sm"
              >
                <option value="">Déplacer vers un groupe...</option>
                {(groupes ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nom} ({g.anneeAcademique})
                  </option>
                ))}
              </select>
              <button
                onClick={deplacerVersGroupe}
                disabled={!groupeCible || enCours}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Déplacer (promotion)
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-text-subtle">
                  <th className="w-8 px-4 py-2" />
                  <th className="px-4 py-2 font-medium">INE</th>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Prénom</th>
                  <th className="px-4 py-2 font-medium">Filière</th>
                  <th className="px-4 py-2 font-medium">Niveau</th>
                  <th className="px-4 py-2 font-medium">Année académique</th>
                </tr>
              </thead>
              <tbody>
                {(etudiantsAffiches ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={selection.has(e.id)} onChange={() => basculer(e.id)} />
                    </td>
                    <td className="px-4 py-2 text-text-muted">{e.ine}</td>
                    <td className="px-4 py-2 font-medium text-text">{e.nom}</td>
                    <td className="px-4 py-2 text-text">{e.prenom}</td>
                    <td className="px-4 py-2 text-text-muted">{e.filiere}</td>
                    <td className="px-4 py-2 text-text-muted">{e.niveau}</td>
                    <td className="px-4 py-2 text-text-muted">{e.anneeAcademique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {etudiantsAffiches === null ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
            ) : etudiantsAffiches.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Aucun étudiant ne correspond à ces filtres.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
