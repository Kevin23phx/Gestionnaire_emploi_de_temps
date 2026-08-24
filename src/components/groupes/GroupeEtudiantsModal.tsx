"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, UserMinus, X } from "lucide-react";
import type { Etudiant, Groupe } from "@/lib/types";
import { normaliser } from "@/lib/recherche";
// Import de type uniquement : effacé à la compilation, ne charge pas la
// bibliothèque — le vrai module est chargé à la demande (import() dynamique
// dans lireFichier) pour ne pas alourdir le chargement initial de la page.
import type ExcelJS from "exceljs";
import { apiFetch } from "@/lib/api";

// FR-REF-01 : gestion du rattachement des étudiants à un groupe — remplace
// la saisie d'un "effectif" à la main (retour utilisateur du 2026-08-18).
//
// Une seule façon de peupler un groupe : importer une liste (fichier Excel,
// Markdown/CSV, ou texte collé) — retirée la recherche d'étudiants "déjà
// connus" du référentiel (retour utilisateur du 2026-08-21 : "je ne vois pas
// l'intérêt de mettre une liste des gens déjà dans un [autre] groupe"). En
// pratique, la scolarité part toujours d'une liste officielle (fichier de
// promotion) plutôt que de chercher des étudiants un par un dans l'appli.
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
  const [texteImport, setTexteImport] = useState("");
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [lectureFichier, setLectureFichier] = useState(false);

  useEffect(() => {
    apiFetch("/etudiants")
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

  async function retirer(etudiantId: string) {
    setEnCours(true);
    const reponse = await apiFetch("/etudiants/affecter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etudiantIds: [etudiantId], groupeId: null }),
    });
    setEnCours(false);
    if (!reponse.ok) return;

    // signalerEffectif prévient le parent (setGroupes) : appelé ici, hors de
    // l'updater passé à setEtudiants, jamais depuis son corps — React
    // interdit d'appeler le setState d'un autre composant pendant le rendu
    // déclenché par un updater ("Cannot update a component while rendering
    // a different component").
    const suivant = (etudiants ?? []).map((e) => (e.id === etudiantId ? { ...e, groupeId: undefined } : e));
    setEtudiants(suivant);
    signalerEffectif(suivant);
  }

  // Découpe une ligne en cellules : une ligne de tableau Markdown
  // ("| INE | Nom | Prénom |") comme un CSV/TSV classique ("INE, Nom,
  // Prénom" ou tabulations) — les deux formats doivent marcher sans que
  // l'utilisateur ait à préciser lequel.
  function decouperLigne(ligne: string): string[] {
    const l = ligne.trim();
    if (l.includes("|")) {
      return l
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((v) => v.trim());
    }
    return l.split(/[,\t;]/).map((v) => v.trim());
  }

  // Ligne de séparation d'un tableau Markdown ("|---|:--:|---|") : à
  // ignorer, ce n'est pas une ligne de données.
  function estSeparateurMarkdown(cellules: string[]): boolean {
    return cellules.length > 0 && cellules.every((c) => /^:?-{1,}:?$/.test(c));
  }

  // Détecte une éventuelle ligne d'en-tête ("INE, Nom, Prénom" ou
  // "Matricule; Nom; Prénom", dans n'importe quel ordre) pour retrouver la
  // bonne colonne ; à défaut, ordre par défaut INE / Nom / Prénom.
  function mapperCellules(lignesDeCellules: string[][]): { ine: string; nom: string; prenom: string }[] {
    if (lignesDeCellules.length === 0) return [];

    let indexIne = 0;
    let indexNom = 1;
    let indexPrenom = 2;
    let debut = 0;

    const enTete = lignesDeCellules[0].map((c) => normaliser(c));
    const iIne = enTete.findIndex((c) => c === "ine" || c === "matricule");
    const iNom = enTete.findIndex((c) => c === "nom");
    const iPrenom = enTete.findIndex((c) => c === "prenom");
    if (iIne !== -1 && iNom !== -1 && iPrenom !== -1) {
      indexIne = iIne;
      indexNom = iNom;
      indexPrenom = iPrenom;
      debut = 1;
    }

    return lignesDeCellules.slice(debut).map((cellules) => ({
      ine: cellules[indexIne]?.trim() ?? "",
      nom: cellules[indexNom]?.trim() ?? "",
      prenom: cellules[indexPrenom]?.trim() ?? "",
    }));
  }

  function parserLignesImport(): { ine: string; nom: string; prenom: string }[] {
    const lignesDeCellules = texteImport
      .split("\n")
      .map((ligne) => ligne.trim())
      .filter(Boolean)
      .map(decouperLigne)
      .filter((cellules) => !estSeparateurMarkdown(cellules));
    return mapperCellules(lignesDeCellules);
  }

  const lignesImport = parserLignesImport();
  const lignesValides = lignesImport.filter((l) => l.ine && l.nom && l.prenom);

  async function lireFichier(fichier: File) {
    setErreurImport(null);
    setLectureFichier(true);
    try {
      const estExcel = /\.xlsx?$/i.test(fichier.name);
      if (estExcel) {
        // Chargé à la demande : la plupart des imports se feront via
        // Markdown/CSV collé, pas la peine d'alourdir le chargement initial
        // de la page pour une bibliothèque de lecture Excel.
        const ExcelJSModule = (await import("exceljs")).default;
        const classeur = new ExcelJSModule.Workbook();
        await classeur.xlsx.load(await fichier.arrayBuffer());
        const feuille = classeur.worksheets[0];
        if (!feuille) {
          setErreurImport("Le fichier Excel ne contient aucune feuille.");
          return;
        }
        const lignes: string[][] = [];
        feuille.eachRow((ligne) => {
          const cellules = (ligne.values as ExcelJS.CellValue[]).slice(1); // index 0 inutilisé (1-indexé)
          lignes.push(cellules.map((v) => (v == null ? "" : String(v))));
        });
        const objets = mapperCellules(lignes.filter((c) => !estSeparateurMarkdown(c)));
        setTexteImport(objets.map((o) => `${o.ine}, ${o.nom}, ${o.prenom}`).join("\n"));
      } else {
        setTexteImport((await fichier.text()).trim());
      }
    } catch {
      setErreurImport(
        "Impossible de lire ce fichier — vérifiez qu'il s'agit bien d'un .xlsx, .csv, .md ou .txt valide."
      );
    } finally {
      setLectureFichier(false);
    }
  }

  async function importer() {
    if (lignesImport.length === 0) {
      setErreurImport("Importez un fichier ou collez au moins une ligne au format INE, nom, prénom.");
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
    const reponse = await apiFetch("/etudiants", {
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
                Aucun étudiant rattaché pour l&apos;instant — importez une liste ci-dessous.
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

          {/* Import d'une liste */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text">Importer une liste d&apos;étudiants</h3>
            <p className="mb-2 text-xs text-text-muted">
              Déposez un fichier Excel (.xlsx) ou Markdown/CSV (.md, .csv, .txt), ou collez directement le
              texte ci-dessous — une ligne par étudiant : <code>INE, nom, prénom</code> (avec ou sans
              en-tête, tableau Markdown accepté).
            </p>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-text-muted hover:border-brand hover:text-brand">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {lectureFichier ? "Lecture du fichier..." : "Choisir un fichier (.xlsx, .csv, .md, .txt)"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.md,.txt"
                className="hidden"
                disabled={lectureFichier}
                onChange={(e) => {
                  const fichier = e.target.files?.[0];
                  if (fichier) lireFichier(fichier);
                  e.target.value = "";
                }}
              />
            </label>

            <textarea
              value={texteImport}
              onChange={(e) => setTexteImport(e.target.value)}
              placeholder={"20260501, Ouédraogo, Salif\n20260502, Traoré, Aminata"}
              rows={5}
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
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
              disabled={enCours || lectureFichier}
              className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              Importer et affecter au groupe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
