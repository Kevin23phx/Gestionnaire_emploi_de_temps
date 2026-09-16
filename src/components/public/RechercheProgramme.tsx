"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search } from "lucide-react";
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
// FR-PUB-02 reste respectée malgré la mise à plat : chaque liste déroulante
// ne propose que des valeurs qui mènent réellement quelque part compte tenu
// des étages précédents (elle est désactivée et vide tant que son
// prérequis n'est pas choisi) — un visiteur ne peut toujours pas construire
// une combinaison vide.

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

  useEffect(() => {
    apiFetch("/public/annees")
      .then((r) => r.json())
      .then((d) => setAnnees(d.annees))
      .catch(() => setErreur("Impossible de charger les années académiques. Vérifiez votre connexion."));
  }, []);

  useEffect(() => {
    if (!annee) return;
    apiFetch(`/public/ufrs?anneeAcademique=${encodeURIComponent(annee)}`)
      .then((r) => r.json())
      .then((d) => setUfrs(d.ufrs));
  }, [annee]);

  useEffect(() => {
    if (!annee || !ufrId) return;
    const params = new URLSearchParams({ ufrId, anneeAcademique: annee });
    apiFetch(`/public/departements?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setDepartements(d.departements));
  }, [annee, ufrId]);

  useEffect(() => {
    if (!annee || !ufrId || !departement) return;
    const params = new URLSearchParams({ ufrId, departement, anneeAcademique: annee });
    apiFetch(`/public/niveaux?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setNiveaux(d.niveaux));
  }, [annee, ufrId, departement]);

  // Les réinitialisations des étages avals se font ici, dans le geste qui
  // les invalide (le clic), jamais dans le corps d'un effet : sans ça,
  // choisir une nouvelle Année afficherait un instant les Établissements de
  // la précédente, le temps que le nouvel appel réseau revienne.
  function changerAnnee(valeur: string) {
    setAnnee(valeur);
    setUfrs(null);
    setUfrId("");
    setDepartements(null);
    setDepartement("");
    setNiveaux(null);
    setNiveau("");
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
            disabled={!annee || ufrs === null}
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
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
          <Search className="mx-auto mb-2 h-5 w-5 text-text-subtle" aria-hidden="true" />
          Aucun groupe ne correspond à cette combinaison.
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
