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
//
// [V8.5, 2026-09-23] « Actualiser » ouvre l'écran de programme dès qu'un
// groupe correspond, même si ce groupe n'a aucun cours saisi. Le message
// « pas encore disponible » ne subsiste ici que pour le cas où AUCUN
// groupe n'existe — il n'y a alors rien à ouvrir, aucun programme à mettre
// en favori ni à abonner à un agenda.
//
// Motif, donné par le porteur de projet : un message sous les filtres
// suppose qu'on le lise, et les gens ne lisent pas. L'écran de programme
// montre au lieu de dire — la semaine, les flèches pour en changer, les
// boutons d'action — et reste utile même quand la semaine est vide.
//
//
// [V8, 2026-09-21] Réforme « Niveau / Spécialité ». Le quatrième filtre
// s'intitulait « Parcours » et contenait en réalité des NIVEAUX (L1…M2) :
// un seul mot pour deux notions, et aucune place pour la troisième. Il
// s'appelle désormais « Niveau », et un cinquième étage — « Spécialité » —
// porte le vrai parcours (Mathématiques, Physique, Chimie, Informatique…).
//
// Ce cinquième étage est le seul de la cascade qui puisse être VIDE sans
// que ce soit une anomalie, et c'est tout l'objet de la réforme : en L1,
// une licence de portail comme MPCI est un tronc commun — il n'y a rien à
// choisir ; c'est en L2 que la cohorte se répartit. Le champ est donc
// DÉSACTIVÉ et non masqué dans ce cas, avec la raison écrite dessous : un
// champ qui apparaît et disparaît au gré des sélections donne l'impression
// d'un écran instable, là où un champ grisé explique la règle.

export function RechercheProgramme() {
  const router = useRouter();
  const [annees, setAnnees] = useState<string[] | null>(null);
  const [ufrs, setUfrs] = useState<Ufr[] | null>(null);
  const [departements, setDepartements] = useState<string[] | null>(null);
  const [niveaux, setNiveaux] = useState<string[] | null>(null);
  // null = pas encore demandé/en vol ; [] = ce niveau ne propose aucune
  // spécialité. Les deux états sont distincts et se lisent différemment à
  // l'écran (« Chargement… » contre « Aucune spécialité à ce niveau »).
  const [specialites, setSpecialites] = useState<string[] | null>(null);

  const [annee, setAnnee] = useState("");
  const [ufrId, setUfrId] = useState("");
  const [departement, setDepartement] = useState("");
  const [niveau, setNiveau] = useState("");
  const [specialite, setSpecialite] = useState("");

  const [resultatsPrets, setResultatsPrets] = useState(false);
  const [chargementResultats, setChargementResultats] = useState(false);
  const [groupes, setGroupes] = useState<GroupePublic[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Une spécialité n'est exigée QUE si le niveau choisi en propose. Sans
  // cette nuance, aucun programme de L1 ne serait plus consultable.
  const specialitesDisponibles = specialites !== null && specialites.length > 0;
  const toutSelectionne = Boolean(
    annee && ufrId && departement && niveau && (!specialitesDisponibles || specialite)
  );
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

  // [V8] Les spécialités dépendent du COUPLE (département, niveau) : c'est
  // ce qui permet à MPCI de n'en proposer qu'à partir de la L2.
  useEffect(() => {
    if (!ufrId || !departement || !niveau) return;
    let annule = false;
    const params = new URLSearchParams({ ufrId, departement, niveau });
    apiFetch(`/public/specialites?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!annule) setSpecialites(d.specialites);
      })
      // Un échec réseau ici ne doit pas bloquer toute la recherche : on
      // retombe sur « aucune spécialité », ce qui redonne exactement le
      // comportement d'avant la réforme plutôt qu'un écran mort.
      .catch(() => {
        if (!annule) setSpecialites([]);
      });
    return () => {
      annule = true;
    };
  }, [ufrId, departement, niveau]);

  // Les réinitialisations des étages avals se font ici, dans le geste qui
  // les invalide (le clic), jamais dans le corps d'un effet : sans ça,
  // choisir un nouvel Établissement afficherait un instant les Départements
  // du précédent, le temps que le nouvel appel réseau revienne.
  //
  // Toutes remettent aussi le RÉSULTAT à demander : il portait sur une
  // sélection qui vient de changer.
  function changerAnnee(valeur: string) {
    setAnnee(valeur);
    // Les étages avals ne sont pas vidés : ils ne dépendent pas de l'année.
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerUfr(valeur: string) {
    setUfrId(valeur);
    setDepartements(null);
    setDepartement("");
    setNiveaux(null);
    setNiveau("");
    setSpecialites(null);
    setSpecialite("");
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerDepartement(valeur: string) {
    setDepartement(valeur);
    setNiveaux(null);
    setNiveau("");
    setSpecialites(null);
    setSpecialite("");
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerNiveau(valeur: string) {
    setNiveau(valeur);
    // [V8] Le niveau commande la spécialité : en changer invalide le choix
    // précédent, qui pourrait n'exister qu'à l'ancien niveau (« Chimie » en
    // L2 mais pas en L1).
    setSpecialites(null);
    setSpecialite("");
    setResultatsPrets(false);
    setGroupes(null);
  }

  function changerSpecialite(valeur: string) {
    setSpecialite(valeur);
    setResultatsPrets(false);
    setGroupes(null);
  }

  // [V8.1] La spécialité voyage jusqu'à la feuille de programme. C'est ce
  // qui permet de retrouver « le même chemin » jusqu'au bout : depuis que
  // l'affectation se fait au créneau, un groupe unique sert plusieurs
  // spécialités — sans ce paramètre, l'étudiant d'Informatique et celui de
  // Chimie arriveraient sur la même page, avec tous les cours mélangés.
  function lienProgramme(groupeId: string): string {
    return specialite
      ? `/programme/${groupeId}?specialite=${encodeURIComponent(specialite)}`
      : `/programme/${groupeId}`;
  }

  function actualiser() {
    if (!toutSelectionne) return;
    setResultatsPrets(true);
    setChargementResultats(true);
    const params = new URLSearchParams({ ufrId, departement, niveau, anneeAcademique: annee });
    // Ajoutée seulement si elle a été choisie : envoyer une chaîne vide
    // ferait filtrer sur « groupes sans spécialité » côté serveur, ce qui
    // masquerait au contraire tous les groupes spécialisés.
    if (specialite) params.set("specialite", specialite);
    apiFetch(`/public/groupes?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { groupes: GroupePublic[] }) => {
        setChargementResultats(false);
        // [V8.5] Un seul groupe : on ouvre son programme directement, sans
        // repasser par une carte à cliquer.
        //
        // Ce n'est pas qu'un raccourci de confort. Un message sous les
        // filtres suppose qu'on le lise, et le porteur de projet l'a dit
        // sans détour : les gens ne lisent pas. L'écran de programme, lui,
        // montre — la grille de la semaine, les flèches pour en changer,
        // et les boutons Favori / Agenda / M'avertir. Même vide, il
        // apprend au visiteur quoi faire ensuite ; le message, non.
        //
        // À deux groupes ou plus, la carte reste : il y a alors une vraie
        // question à poser (Groupe A ou Groupe B), et on ne peut pas ouvrir
        // deux programmes à la fois.
        if (d.groupes.length === 1) {
          router.push(lienProgramme(d.groupes[0].id));
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
      {/* [V8.1] Une GRILLE et non un `flex-wrap`. Avec cinq champs de
          largeur libre, le dernier se retrouvait seul sur la deuxième ligne
          et s'étirait sur toute la largeur — « Spécialité » faisait trois
          fois la taille de « Niveau » pour un contenu plus court. La grille
          donne des colonnes de largeur égale à chaque palier, comme les
          barres de filtres des écrans gestionnaire. */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

        {/* [V8] « Niveau » et non plus « Parcours » : ce champ a toujours
            contenu des niveaux du LMD (L1…M2), c'est son libellé qui était
            faux. Le parcours, lui, est le champ suivant. */}
        <Champ label="Niveau">
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

        {/* [V8] Spécialité — le cinquième étage, activé seulement si le
            niveau choisi en propose. Un niveau de tronc commun (L1 MPCI)
            laisse ce champ grisé avec sa raison écrite en dessous, plutôt
            que de le faire disparaître. */}
        <Champ label="Spécialité">
          <select
            value={specialite}
            onChange={(e) => changerSpecialite(e.target.value)}
            disabled={!specialitesDisponibles}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
          >
            <option value="">
              {!niveau
                ? "Choisissez un niveau"
                : specialites === null
                  ? "Chargement..."
                  : specialites.length === 0
                    ? "Aucune à ce niveau"
                    : "Choisir..."}
            </option>
            {(specialites ?? []).map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
          {niveau && specialites !== null && specialites.length === 0 ? (
            // Dit pourquoi le champ est inerte. Sans cette phrase, le
            // visiteur de L1 croit que la page n'a pas fini de charger et
            // attend un choix qui ne viendra jamais.
            <span className="text-xs text-text-subtle">
              {niveau} est un tronc commun : pas de choix à faire.
            </span>
          ) : null}
        </Champ>

        </div>

        {/* Hors de la grille : un bouton logé dans une colonne de filtre
            s'alignerait sur la hauteur des libellés et paraîtrait être un
            sixième champ. */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={actualiser}
            disabled={!toutSelectionne}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Zone d'affichage : rien tant que les filtres ne sont pas choisis
          ET qu'Actualiser n'a pas été cliqué.

          [V8.4] C'est ici que TOUTE réponse arrive désormais — zéro, un ou
          plusieurs programmes. Le cas « un seul » partait auparavant
          directement sur la feuille de programme, ce qui faisait répondre
          l'écran à deux endroits différents selon la sélection. */}
      {!resultatsPrets ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          <Search className="mx-auto mb-2 h-5 w-5 text-text-subtle" aria-hidden="true" />
          {/* Compté et non écrit en dur : « les 5 filtres » serait faux pour
              un niveau de tronc commun, qui n'en a que 4 à renseigner. */}
          Choisissez les {specialitesDisponibles ? 5 : 4} filtres ci-dessus puis cliquez sur Actualiser
          pour afficher votre programme.
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
            Le programme de {niveau}
            {specialite ? ` ${specialite}` : ""} — {departement} n&apos;est pas encore disponible pour{" "}
            {annee}.
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
              onClick={() => router.push(lienProgramme(g.id))}
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
    // Plus de `flex-1 min-w-[160px]` : la largeur vient de la grille
    // parente, et ces deux règles l'auraient au contraire forcée à déborder.
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}
