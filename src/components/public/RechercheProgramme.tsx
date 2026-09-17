"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, RefreshCw, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { GroupePublic, Ufr } from "@/lib/types";

// [2026-09] Retour des gestionnaires post-présentation : la cascade n'est
// plus un assistant pas-à-pas (un étage à la fois, qui avance tout seul dès
// qu'on clique) — c'est désormais une zone de SÉLECTION (les 4 listes
// déroulantes, toutes visibles à la fois, horizontalement) séparée d'une
// zone d'AFFICHAGE (les résultats), sur le modèle d'un écran de filtres
// classique. Rien ne s'affiche tant que les 4 sélections ne sont pas
// complètes ET qu'on n'a pas cliqué sur "Actualiser" — pas de chargement
// intermédiaire, pas de résultat partiel.
//
// [2026-09] Retour du porteur de projet : les listes ne se limitent plus à
// ce qui mène à un programme DÉJÀ publié. Un étudiant de L2 ne voyait pas
// « L2 » tant que sa scolarité n'avait rien saisi : impossible pour lui de
// distinguer « ce parcours n'existe pas » de « ce parcours n'est pas encore
// publié », et la liste paraissait trouée. Chaque étage propose donc le
// référentiel (établissements, départements officiels, niveaux du LMD,
// années courantes — cf. public/services.py), et c'est la zone d'affichage
// qui dit en toutes lettres qu'une combinaison n'a pas encore de programme.
//
// Ce qui subsiste de la cascade, c'est l'ordre de saisie : un département
// appartient à un établissement, on ne peut donc le proposer avant lui.

export function RechercheProgramme() {
  const router = useRouter();
  const [annees, setAnnees] = useState<string[] | null>(null);
  const [ufrs, setUfrs] = useState<Ufr[] | null>(null);
  const [departements, setDepartements] = useState<string[] | null>(null);
  const [niveaux, setNiveaux] = useState<string[] | null>(null);

  const [annee, setAnnee] = useState("");
  const [ufrId, setUfrId] = useState("");
  const [departement, setDepartement] = useState("");
  const [niveau, setNiveau] = useState("");

  const [resultatsPrets, setResultatsPrets] = useState(false);
  const [chargementResultats, setChargementResultats] = useState(false);
  const [groupes, setGroupes] = useState<GroupePublic[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const toutSelectionne = Boolean(annee && ufrId && departement && niveau);
  // Le sigle plutôt que l'identifiant dans le message « pas encore publié » :
  // c'est sous ce nom que le visiteur connaît son établissement.
  const sigleEtablissement = (ufrs ?? []).find((u) => u.id === ufrId)?.sigleAffiche ?? "votre établissement";

  useEffect(() => {
    apiFetch("/public/annees")
      .then((r) => r.json())
      .then((d) => setAnnees(d.annees))
      .catch(() => setErreur("Impossible de charger les années académiques. Vérifiez votre connexion."));
  }, []);

  // Les établissements ne dépendent plus de l'année choisie : une UFR ne
  // cesse pas d'exister l'année où sa scolarité n'a rien saisi. La liste est
  // donc chargée une fois, dès l'ouverture.
  useEffect(() => {
    apiFetch("/public/ufrs")
      .then((r) => r.json())
      .then((d) => setUfrs(d.ufrs));
  }, []);

  // Le département dépend de l'établissement (il lui appartient), plus de
  // l'année : le référentiel des départements ne change pas d'une année sur
  // l'autre parce qu'un programme a été saisi ou non.
  useEffect(() => {
    if (!ufrId) return;
    apiFetch(`/public/departements?ufrId=${encodeURIComponent(ufrId)}`)
      .then((r) => r.json())
      .then((d) => setDepartements(d.departements));
  }, [ufrId]);

  useEffect(() => {
    if (!ufrId || !departement) return;
    const params = new URLSearchParams({ ufrId, departement });
    apiFetch(`/public/niveaux?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setNiveaux(d.niveaux));
  }, [ufrId, departement]);

  // Les réinitialisations des étages avals se font ici, dans le geste qui
  // les invalide (le clic), jamais dans le corps d'un effet : sans ça,
  // choisir un nouvel Établissement afficherait un instant les Départements
  // du précédent, le temps que le nouvel appel réseau revienne.
  function changerAnnee(valeur: string) {
    setAnnee(valeur);
    // Les étages avals ne sont pas vidés : ils ne dépendent plus de l'année.
    // Seul le RÉSULTAT, lui, redevient à demander.
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerUfr(valeur: string) {
    setUfrId(valeur);
    setDepartements(null);
    setDepartement("");
    setNiveaux(null);
    setNiveau("");
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerDepartement(valeur: string) {
    setDepartement(valeur);
    setNiveaux(null);
    setNiveau("");
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerNiveau(valeur: string) {
    setNiveau(valeur);
    setResultatsPrets(false);
    setGroupes(null);
  }

  function actualiser() {
    if (!toutSelectionne) return;
    setResultatsPrets(true);
    setChargementResultats(true);
    const params = new URLSearchParams({ ufrId, departement, niveau, anneeAcademique: annee });
    apiFetch(`/public/groupes?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { groupes: GroupePublic[] }) => {
        setChargementResultats(false);
        // Un seul groupe possible : inutile de faire cliquer une fois de
        // plus sur une liste à un élément.
        if (d.groupes.length === 1) {
          router.push(`/programme/${d.groupes[0].id}`);
          return;
        }
        setGroupes(d.groupes);
      });
  }

  if (erreur) {
    return (
      <div className="rounded-xl border border-status-danger/30 bg-status-danger-bg p-6 text-center text-sm text-text">
        {erreur}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Zone de sélection : les 4 filtres, horizontaux, toujours visibles. */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-4">
        <Champ label="Année académique">
          <select
            value={annee}
            onChange={(e) => changerAnnee(e.target.value)}
            disabled={annees === null}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
          >
            <option value="">Choisir...</option>
            {(annees ?? []).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Champ>

        {/* [V3.2] « Établissement » et non « UFR » : l'UJKZ compte 6 instituts
            et 1 école doctorale en plus de ses 5 UFR. */}
        <Champ label="Établissement">
          <select
            value={ufrId}
            onChange={(e) => changerUfr(e.target.value)}
            disabled={ufrs === null}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
          >
            <option value="">Choisir...</option>
            {(ufrs ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.sigleAffiche}
              </option>
            ))}
          </select>
        </Champ>

        <Champ label="Département">
          <select
            value={departement}
            onChange={(e) => changerDepartement(e.target.value)}
            disabled={!ufrId || departements === null}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
          >
            <option value="">Choisir...</option>
            {(departements ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Champ>

        <Champ label="Parcours">
          <select
            value={niveau}
            onChange={(e) => changerNiveau(e.target.value)}
            disabled={!departement || niveaux === null}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
          >
            <option value="">Choisir...</option>
            {(niveaux ?? []).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Champ>

        <button
          onClick={actualiser}
          disabled={!toutSelectionne}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualiser
        </button>
      </div>

      {/* Zone d'affichage : rien tant que les 4 filtres ne sont pas choisis
          ET qu'Actualiser n'a pas été cliqué. */}
      {!resultatsPrets ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          <Search className="mx-auto mb-2 h-5 w-5 text-text-subtle" aria-hidden="true" />
          Choisissez les 4 filtres ci-dessus puis cliquez sur Actualiser pour afficher votre programme.
        </div>
      ) : chargementResultats ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-10 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chargement...
        </div>
      ) : groupes && groupes.length === 0 ? (
        // ERR-07 étendue : dire que le programme demandé n'est pas encore
        // publié, en le nommant. « Aucun résultat » laisserait le visiteur
        // penser qu'il s'est trompé de sélection.
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
          <CalendarClock className="mx-auto mb-2 h-5 w-5 text-text-subtle" aria-hidden="true" />
          <p className="font-medium text-text">
            Le programme de {niveau} — {departement} n&apos;est pas encore disponible pour {annee}.
          </p>
          <p className="mt-1">
            Il apparaîtra ici dès que la scolarité de {sigleEtablissement} l&apos;aura publié. Vous pouvez
            revenir plus tard ou choisir une autre sélection.
          </p>
        </div>
      ) : groupes ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {groupes.map((g) => (
            <button
              key={g.id}
              onClick={() => router.push(`/programme/${g.id}`)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-brand-light"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-text">{g.nom}</span>
                {/* ERR-07 : distinguer, AVANT de cliquer, un programme rempli
                    d'un programme encore vide. */}
                <span className="block truncate text-xs text-text-muted">
                  {g.nbCreneaux > 0
                    ? `${g.anneeAcademique} · ${g.nbCreneaux} cours`
                    : `${g.anneeAcademique} · programme pas encore saisi`}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-[160px] flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}
