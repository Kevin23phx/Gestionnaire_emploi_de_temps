"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Search, Square, UserMinus, X } from "lucide-react";
import type { Etudiant, Groupe } from "@/lib/types";
import { normaliser } from "@/lib/recherche";

// FR-REF-01 : gestion du rattachement des étudiants à un groupe — remplace
// la saisie d'un "effectif" à la main (retour utilisateur du 2026-08-18).
// Deux façons de peupler un groupe, sans jamais ressaisir un étudiant qui
// existe déjà quelque part dans Campus Manager :
// 1. Affecter des étudiants déjà connus du référentiel (recherche + case à
//    cocher + action groupée, "Tout sélectionner" inclus) — cas d'un lot
//    fraîchement importé mais pas encore trié, ou d'un transfert entre
//    groupes.
// 2. Importer une nouvelle liste (coller INE/nom/prénom, une ligne par
//    étudiant) — le mécanisme qui remplace l'insertion un par un, pour des
//    étudiants encore inconnus de Campus Manager.
export function GroupeEtudiantsModal({
  groupe,
  onClose,
  onEffectifChange,
}: {
  groupe: Groupe;
  onClose: () => void;
  onEffectifChange: (groupeId: string, nouvelEffectif: number) => void;
}) {
  const [etudiants, setEtudiants] = useState<Etudiant[] | null>(null);
  const [rechercheAjout, setRechercheAjout] = useState("");
  const [selectionAjout, setSelectionAjout] = useState<Set<string>>(new Set());
  const [texteImport, setTexteImport] = useState("");
  const [erreurAjout, setErreurAjout] = useState<string | null>(null);
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    fetch("/api/etudiants")
      .then((r) => r.json())
      .then((data) => setEtudiants(data.etudiants));
  }, []);

  function signalerEffectif(liste: Etudiant[]) {
    onEffectifChange(groupe.id, liste.filter((e) => e.groupeId === groupe.id).length);
  }

  const membres = useMemo(
    () => (etudiants ?? []).filter((e) => e.groupeId === groupe.id),
    [etudiants, groupe.id]
  );

  const candidats = useMemo(() => {
    // Chaque mot tapé doit se retrouver quelque part (nom, prénom ou INE) —
    // pas de correspondance de sous-chaîne unique sur "prénom nom"
    // concaténés, qui échouait sur une recherche tapée "nom prénom" (ordre
    // naturel en français administratif, retour utilisateur du 2026-08-18).
    const termes = normaliser(rechercheAjout.trim())
      .split(/\s+/)
      .filter(Boolean);
    return (etudiants ?? [])
      .filter((e) => e.groupeId !== groupe.id)
      .filter((e) => {
        if (termes.length === 0) return true;
        const cible = normaliser(`${e.prenom} ${e.nom} ${e.ine}`);
        return termes.every((terme) => cible.includes(terme));
      });
  }, [etudiants, groupe.id, rechercheAjout]);

  function toggleSelectionAjout(id: string) {
    setErreurAjout(null);
    setSelectionAjout((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function toutSelectionnerAjout() {
    setErreurAjout(null);
    setSelectionAjout(new Set(candidats.map((e) => e.id)));
  }

  function viderSelectionAjout() {
    setSelectionAjout(new Set());
  }

  async function retirer(etudiantId: string) {
    setEnCours(true);
    const reponse = await fetch("/api/etudiants/affecter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etudiantIds: [etudiantId], groupeId: null }),
    });
    setEnCours(false);
    if (!reponse.ok) return;

    // signalerEffectif prévient le parent (setGroupes) : appelé ici, hors de
    // l'updater passé à setEtudiants, jamais depuis son corps — React
    // interdit d'appeler le setState d'un autre composant pendant le rendu
    // déclenché par un updater (avertissement rencontré en testant : "Cannot
    // update a component while rendering a different component").
    const suivant = (etudiants ?? []).map((e) => (e.id === etudiantId ? { ...e, groupeId: undefined } : e));
    setEtudiants(suivant);
    signalerEffectif(suivant);
  }

  async function affecterSelection() {
    if (selectionAjout.size === 0) {
      setErreurAjout("Cochez au moins un étudiant dans la liste ci-dessous.");
      return;
    }
    setErreurAjout(null);
    setEnCours(true);
    const reponse = await fetch("/api/etudiants/affecter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etudiantIds: [...selectionAjout], groupeId: groupe.id }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreurAjout(data.erreur ?? "Impossible d'affecter la sélection.");
      return;
    }

    const suivant = (etudiants ?? []).map((e) => {
      const maj = (data.etudiants as Etudiant[]).find((m) => m.id === e.id);
      return maj ?? e;
    });
    setEtudiants(suivant);
    signalerEffectif(suivant);
    setConfirmation(`${selectionAjout.size} étudiant(s) affecté(s) au groupe.`);
    setSelectionAjout(new Set());
    setTimeout(() => setConfirmation(null), 4000);
  }

  // Une ligne = un étudiant : "INE,nom,prenom" (la virgule ou une tabulation
  // conviennent toutes les deux — un copier-coller depuis un tableur colle
  // des tabulations, un CSV des virgules).
  function parserLignesImport(): { ine: string; nom: string; prenom: string }[] {
    return texteImport
      .split("\n")
      .map((ligne) => ligne.trim())
      .filter(Boolean)
      .map((ligne) => {
        const [ine, nom, prenom] = ligne.split(/[,\t]/).map((v) => v?.trim() ?? "");
        return { ine, nom, prenom };
      });
  }

  const lignesImport = parserLignesImport();
  const lignesValides = lignesImport.filter((l) => l.ine && l.nom && l.prenom);

  async function importer() {
    if (lignesImport.length === 0) {
      setErreurImport("Collez au moins une ligne au format INE, nom, prénom.");
      return;
    }
    if (lignesValides.length < lignesImport.length) {
      setErreurImport(
        `${lignesImport.length - lignesValides.length} ligne(s) incomplète(s) (INE, nom et prénom sont tous les trois obligatoires) — corrigez-les avant d'importer.`
      );
      return;
    }
    setErreurImport(null);
    setEnCours(true);
    const reponse = await fetch("/api/etudiants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etudiants: lignesValides.map((l) => ({ ...l, filiere: groupe.filiere, niveau: groupe.niveau })),
        groupeId: groupe.id,
      }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreurImport(data.erreur ?? "Impossible d'importer cette liste.");
      return;
    }

    const suivant = [...(etudiants ?? []), ...(data.etudiants as Etudiant[])];
    setEtudiants(suivant);
    signalerEffectif(suivant);

    const pluriel = data.etudiants.length > 1 ? `${data.etudiants.length} étudiants importés` : "1 étudiant importé";
    setConfirmation(
      data.doublons.length > 0
        ? `${pluriel}. ${data.doublons.length} INE déjà connu(s) ignoré(s) : ${data.doublons.join(", ")}.`
        : `${pluriel}.`
    );
    setTexteImport("");
    setTimeout(() => setConfirmation(null), 6000);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text">Étudiants — {groupe.nom}</h2>
            <p className="text-sm text-text-muted">{membres.length} étudiant(s) rattaché(s)</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {confirmation ? (
          <p className="mb-4 rounded-lg bg-status-success-bg px-3 py-2 text-sm text-status-success">
            {confirmation}
          </p>
        ) : null}

        <div className="flex flex-col gap-6">
          {/* Membres actuels */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text">Membres du groupe</h3>
            {etudiants === null ? (
              <p className="text-sm text-text-muted">Chargement...</p>
            ) : membres.length === 0 ? (
              <p className="text-sm text-text-muted">
                Aucun étudiant rattaché pour l&apos;instant — affectez-en ci-dessous.
              </p>
            ) : (
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-border">
                {membres.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-sm last:border-b-0"
                  >
                    <span className="text-text">
                      {e.prenom} {e.nom} <span className="text-text-subtle">· INE {e.ine}</span>
                    </span>
                    <button
                      onClick={() => retirer(e.id)}
                      disabled={enCours}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-status-danger disabled:opacity-50"
                    >
                      <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Affecter des étudiants déjà connus */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text">Affecter des étudiants déjà connus</h3>
              {candidats.length > 0 ? (
                <button
                  onClick={selectionAjout.size === candidats.length ? viderSelectionAjout : toutSelectionnerAjout}
                  className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                >
                  {selectionAjout.size === candidats.length ? (
                    <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {selectionAjout.size === candidats.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
                aria-hidden="true"
              />
              <input
                type="text"
                value={rechercheAjout}
                onChange={(e) => setRechercheAjout(e.target.value)}
                placeholder="Rechercher par nom ou INE..."
                className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-border">
              {candidats.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">
                  {etudiants === null ? "Chargement..." : "Aucun étudiant ne correspond."}
                </li>
              ) : (
                candidats.map((e) => (
                  <li key={e.id} className="border-b border-border last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-muted">
                      <input
                        type="checkbox"
                        checked={selectionAjout.has(e.id)}
                        onChange={() => toggleSelectionAjout(e.id)}
                        className="h-4 w-4 accent-brand"
                      />
                      <span className="text-text">
                        {e.prenom} {e.nom} <span className="text-text-subtle">· INE {e.ine}</span>
                      </span>
                      {e.groupeId ? (
                        <span className="ml-auto text-xs text-text-subtle">déjà dans un autre groupe</span>
                      ) : null}
                    </label>
                  </li>
                ))
              )}
            </ul>
            {erreurAjout ? (
              <p className="mt-2 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
                {erreurAjout}
              </p>
            ) : null}
            <button
              onClick={affecterSelection}
              disabled={enCours}
              className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              Affecter la sélection {selectionAjout.size > 0 ? `(${selectionAjout.size})` : ""}
            </button>
          </div>

          {/* Import d'une nouvelle liste */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text">Importer une nouvelle liste</h3>
            <p className="mb-2 text-xs text-text-muted">
              Une ligne par étudiant : <code>INE, nom, prénom</code> — collez directement depuis un
              tableur.
            </p>
            <textarea
              value={texteImport}
              onChange={(e) => setTexteImport(e.target.value)}
              placeholder={"20260501, Ouédraogo, Salif\n20260502, Traoré, Aminata"}
              rows={4}
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
            />
            {texteImport.trim() ? (
              <p className="mt-1 text-xs text-text-subtle">
                {lignesValides.length} ligne(s) prête(s) à importer
                {lignesImport.length > lignesValides.length
                  ? ` · ${lignesImport.length - lignesValides.length} incomplète(s)`
                  : ""}
                .
              </p>
            ) : null}
            {erreurImport ? (
              <p className="mt-2 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
                {erreurImport}
              </p>
            ) : null}
            <button
              onClick={importer}
              disabled={enCours}
              className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-muted disabled:opacity-50"
            >
              Importer et affecter au groupe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
