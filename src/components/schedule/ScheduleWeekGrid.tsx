"use client";

import { useState } from "react";
import type { Creneau, StatutSeance } from "@/lib/types";
import { PAUSES } from "@/lib/pauses";
import { datesDeLaSemaine, libelleDateCourte } from "@/lib/semaines";

const JOURS: { key: Creneau["jour"]; label: string; court: string }[] = [
  { key: "lundi", label: "Lundi", court: "Lun" },
  { key: "mardi", label: "Mardi", court: "Mar" },
  { key: "mercredi", label: "Mercredi", court: "Mer" },
  { key: "jeudi", label: "Jeudi", court: "Jeu" },
  { key: "vendredi", label: "Vendredi", court: "Ven" },
  { key: "samedi", label: "Samedi", court: "Sam" },
];

// getDay() : 0=dimanche, 1=lundi... — décalé d'un cran par rapport à JOURS
// (qui commence au lundi, pas de cours le dimanche dans le MVP).
const JOUR_ACTUEL = JOURS[new Date().getDay() - 1]?.key ?? "lundi";

const HEURE_DEBUT = 7;
const HEURE_FIN = 18;
const HEURES = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i);

// Une ligne de grille = 1 quart d'heure, pas 1 heure : nécessaire depuis que
// les créneaux sont découpés autour des pauses fixes (decouperSelonPauses),
// qui tombent sur des quarts d'heure (10h15, 15h15) et non plus uniquement
// sur des heures rondes.
const QUARTS_PAR_HEURE = 4;
const NB_QUARTS = (HEURE_FIN - HEURE_DEBUT) * QUARTS_PAR_HEURE;
const HAUTEUR_QUART = 18; // 4 × 18px = 72px/heure, inchangé visuellement

// Fond plein (pas de dilution en opacité) + accent de couleur à gauche : plus
// lisible que l'ancien traitement translucide, qui écrasait le contraste du texte.
const CARTE_CLASSES: Record<StatutSeance, string> = {
  normal: "border-l-4 border-status-info bg-status-info-bg",
  modifie: "border-l-4 border-status-warning bg-status-warning-bg",
  annule: "border-l-4 border-status-danger bg-status-danger-bg",
};

const LEGENDE: { statut: StatutSeance; label: string; dot: string }[] = [
  { statut: "normal", label: "Normal", dot: "bg-status-info" },
  { statut: "modifie", label: "Modifié", dot: "bg-status-warning" },
  { statut: "annule", label: "Annulé", dot: "bg-status-danger" },
];

// [V4] Le statut d'un créneau est simplement le sien : il porte sa propre
// date, l'annuler n'annule que cette séance-là. La distinction
// « séance annulée » / « cours annulé » de la V3 n'a plus d'objet.

function heureVersQuart(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return (h - HEURE_DEBUT) * QUARTS_PAR_HEURE + Math.floor(m / 15);
}

function heureVersLigne(heure: string): number {
  return heureVersQuart(heure) + 2; // +2 : ligne 1 = en-tête des jours
}

// `renderMeta` était une fonction passée en prop, mais ScheduleWeekGrid est
// maintenant un Client Component (useState pour l'onglet jour de l'agenda
// mobile) : une fonction ne peut pas traverser la frontière Server → Client
// Component quand l'appelant (etudiant/page.tsx, enseignant/page.tsx) est un
// Server Component. Une variante sérialisable (chaîne) suffit, vu qu'il n'y
// avait que deux formats réels dans toute l'appli.
type VarianteMeta = "salle-enseignant" | "salle-groupe";

function formaterMeta(creneau: Creneau, variante: VarianteMeta): string {
  return variante === "salle-enseignant"
    ? `${creneau.salle.nom} · ${creneau.enseignant.prenom} ${creneau.enseignant.nom}`
    : `${creneau.salle.nom} · ${creneau.groupe.nom}`;
}

function chevauchentHoraire(a: Creneau, b: Creneau): boolean {
  return a.heureDebut < b.heureFin && b.heureDebut < a.heureFin;
}

// Regroupe les créneaux d'un même jour qui se chevauchent dans le temps, pour
// qu'ils soient affichés côte à côte plutôt que superposés (l'un cachant
// l'autre) — cas réel rencontré dès qu'un conflit de salle/enseignant/groupe
// existe, exactement ce que le moteur de conflits (FR-CONF-01→03) doit faire
// remarquer, pas dissimuler.
function grouperChevauchements(creneauxJour: Creneau[]): Creneau[][] {
  const groupes: Creneau[][] = [];
  for (const creneau of creneauxJour) {
    const chevauchants = groupes.filter((g) => g.some((c) => chevauchentHoraire(c, creneau)));
    if (chevauchants.length === 0) {
      groupes.push([creneau]);
      continue;
    }
    const [premier, ...autres] = chevauchants;
    premier.push(creneau);
    for (const autre of autres) {
      premier.push(...autre);
      groupes.splice(groupes.indexOf(autre), 1);
    }
  }
  return groupes;
}

// La carte s'adapte à la HAUTEUR dont elle dispose, exprimée en quarts
// d'heure. Sans ça, une séance de 45 min (3 quarts = 54 px) tentait
// d'afficher les mêmes quatre lignes qu'une séance de 2 h : le contenu
// débordait et se retrouvait rogné, l'intitulé réduit à un liseré illisible
// (constaté à l'usage sur les créneaux de 15h15–16h00).
//
// Trois densités plutôt qu'une hauteur de grille plus grande : agrandir la
// grille aurait repoussé le problème d'un cran — il serait revenu sur les
// séances de 30 min — tout en forçant à faire défiler une journée qui tenait
// jusqu'ici d'un seul regard.
function CarteCreneau({
  creneau,
  variante,
  onCreneauClick,
  quarts,
}: {
  creneau: Creneau;
  variante: VarianteMeta;
  onCreneauClick?: (creneau: Creneau) => void;
  // Durée disponible, en quarts d'heure (1 quart = 18 px).
  quarts: number;
}) {
  const statut = creneau.statut;
  const motif = creneau.motif;
  const barre = statut === "annule";

  // Seuils calés sur la place réellement disponible (1 quart = 18 px, moins
  // la marge du conteneur), pas sur une intuition : à 1 h pile, la version
  // complète réclamait 69 px pour 64 px offerts — elle débordait de 5 px,
  // assez pour rogner la dernière ligne sans que ce soit flagrant.
  //
  //   ≤ 15 min : intitulé seul, au plus serré
  //   ≤ 30 min : intitulé seul
  //   ≤ 1 h    : intitulé + horaire · salle
  //   au-delà  : tout
  const minuscule = quarts <= 1;
  const tresCompact = quarts <= 2;
  const compact = quarts <= 4;

  const meta = formaterMeta(creneau, variante);
  // L'infobulle porte TOUT ce que la carte a dû retirer : rien n'est
  // définitivement perdu, seulement remis au survol.
  const resume = `${creneau.ue.intitule}\n${creneau.heureDebut}–${creneau.heureFin}\n${meta}${
    motif ? `\nMotif : ${motif}` : ""
  }`;

  return (
    <div
      onClick={onCreneauClick ? () => onCreneauClick(creneau) : undefined}
      title={resume}
      className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-md shadow-sm ${
        minuscule
          ? "gap-0 px-1 py-0"
          : tresCompact
            ? "gap-0 px-1.5 py-0.5"
            : compact
              ? "gap-0 px-2 py-1"
              : "gap-0.5 p-2"
      } ${CARTE_CLASSES[statut]} ${
        onCreneauClick ? "cursor-pointer hover:shadow-md hover:brightness-95" : ""
      }`}
    >
      <p
        className={`truncate font-semibold text-text ${
          minuscule
            ? "text-[10px] leading-none"
            : tresCompact
              ? "text-[11px] leading-tight"
              : compact
                ? "text-xs leading-tight"
                : "text-sm leading-tight"
        } ${barre ? "line-through opacity-70" : ""}`}
      >
        {creneau.ue.intitule}
      </p>

      {!tresCompact ? (
        <p className={`truncate font-medium leading-tight text-text-muted ${compact ? "text-[10px]" : "text-xs"}`}>
          {creneau.heureDebut}–{creneau.heureFin}
          {/* En version serrée, la salle se glisse à la suite de l'horaire
              plutôt que de réclamer une ligne à elle seule. */}
          {compact ? ` · ${meta}` : ""}
        </p>
      ) : null}

      {!compact ? <p className="truncate text-xs text-text-muted">{meta}</p> : null}

      {!compact && motif ? (
        <p className="truncate text-xs italic text-text-subtle">Motif : {motif}</p>
      ) : null}
    </div>
  );
}

// Version agenda (mobile) : une carte pleine largeur par créneau, rien de
// tronqué — c'est précisément ce que la grille ne peut pas offrir sous ~630px
// (retour utilisateur du 2026-08-18 : sur téléphone, la grille force 6
// colonnes de 96px chacune, donc "Algorithmique Avancée" devient "Algorith…"
// et la salle/l'enseignant disparaissent complètement derrière un "…").
function CarteCreneauAgenda({
  creneau,
  variante,
  onCreneauClick,
}: {
  creneau: Creneau;
  variante: VarianteMeta;
  onCreneauClick?: (creneau: Creneau) => void;
}) {
  const statut = creneau.statut;
  const motif = creneau.motif;
  const barre = statut === "annule";
  const badge =
    statut === "modifie"
      ? "Modifié"
      : statut === "annule"
        ? "Annulé"
        : null;
  return (
    <div
      onClick={onCreneauClick ? () => onCreneauClick(creneau) : undefined}
      className={`flex flex-col gap-1 rounded-lg p-3 shadow-sm ${CARTE_CLASSES[statut]} ${
        onCreneauClick ? "cursor-pointer active:brightness-95" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-muted">
          {creneau.heureDebut}–{creneau.heureFin}
        </p>
        {badge ? (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-muted">{badge}</span>
        ) : null}
      </div>
      <p className={`text-base font-semibold leading-tight text-text ${barre ? "line-through opacity-70" : ""}`}>
        {creneau.ue.intitule}
      </p>
      <p className="text-sm text-text-muted">{formaterMeta(creneau, variante)}</p>
      {motif ? <p className="text-sm italic text-text-subtle">Motif : {motif}</p> : null}
    </div>
  );
}

// Affiche l'emploi du temps hebdomadaire — même composant pour les vues étudiant,
// enseignant et scolarité (seul le contenu des cartes de créneau varie via `variante`).
//
// Deux présentations selon la largeur d'écran (retour utilisateur du
// 2026-08-18, cf. cahier des charges §1.4 : la majorité des utilisateurs
// consultent Campus Manager depuis un smartphone) :
// - < md : agenda d'un seul jour à la fois, sélecteur de jour, cartes pleine
//   largeur — rien de tronqué.
// - ≥ md : grille des 6 jours, assez de place pour rester lisible.
export function ScheduleWeekGrid({
  creneaux,
  variante,
  onCreneauClick,
  lundi,
}: {
  creneaux: Creneau[];
  variante: VarianteMeta;
  onCreneauClick?: (creneau: Creneau) => void;
  // [V3] FR-EDT-09 : quand une semaine est fournie, la grille est datée —
  // les en-têtes portent la date et chaque créneau est affiché avec son
  // statut À CETTE DATE (une séance annulée le 15 ne l'est pas le 22).
  // Optionnel pour que le composant reste utilisable en grille « type ».
  lundi?: string;
}) {
  const [jourAgenda, setJourAgenda] = useState<Creneau["jour"]>(JOUR_ACTUEL);
  const dates = lundi ? datesDeLaSemaine(lundi) : undefined;
  const creneauxAgenda = creneaux
    .filter((c) => c.jour === jourAgenda)
    .sort((a, b) => (a.heureDebut < b.heureDebut ? -1 : 1));
  const joursAvecCours = new Set(creneaux.map((c) => c.jour));

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-2.5">
        {LEGENDE.map((l) => (
          <div key={l.statut} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} aria-hidden="true" />
            {l.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-surface-muted" aria-hidden="true" />
          Pause (fixe)
        </div>
      </div>

      {/* Agenda mobile */}
      <div className="md:hidden">
        <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2">
          {JOURS.map((jour) => (
            <button
              key={jour.key}
              onClick={() => setJourAgenda(jour.key)}
              className={`relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                jourAgenda === jour.key
                  ? "bg-brand text-white"
                  : "bg-surface-muted text-text-muted hover:text-text"
              }`}
            >
              <span className="block leading-tight">{jour.court}</span>
              {/* [V4] La date sous le jour : chaque semaine ayant son propre
                  programme, « Lun » seul ne dit plus de quel lundi il
                  s'agit — l'information manquait précisément là où
                  l'écran est le plus petit. */}
              {dates ? (
                <span
                  className={`block text-[10px] font-normal leading-tight ${
                    jourAgenda === jour.key ? "text-white/80" : "text-text-subtle"
                  }`}
                >
                  {libelleDateCourte(dates[JOURS.findIndex((j) => j.key === jour.key)])}
                </span>
              ) : null}
              {joursAvecCours.has(jour.key) && jourAgenda !== jour.key ? (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 p-3">
          {creneauxAgenda.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">Aucun cours ce jour-là.</p>
          ) : (
            creneauxAgenda.map((creneau) => (
              <CarteCreneauAgenda
                key={creneau.id}
                creneau={creneau}
                variante={variante}
                onCreneauClick={onCreneauClick}
              />
            ))
          )}
        </div>
      </div>

      {/* Grille semaine (tablette / bureau) */}
      <div className="hidden overflow-x-auto md:block">
        {/* minmax(112px, 1fr) plutôt qu'un min-w fixe sur tout le conteneur :
            chaque jour ne descend jamais sous une largeur lisible, mais le
            défilement horizontal ne se déclenche que si l'écran est vraiment
            trop étroit pour ça, pas dès qu'il est simplement plus petit
            qu'un chiffre choisi au hasard.
            [V4] Relevé de 96 à 112 px : sur tablette, 96 px tronquaient
            « Anglais avancé » dès le deuxième mot, et la salle disparaissait
            entièrement derrière une ellipse. */}
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `56px repeat(${JOURS.length}, minmax(112px, 1fr))`,
            gridTemplateRows: `auto repeat(${NB_QUARTS}, ${HAUTEUR_QUART}px)`,
          }}
        >
          {/* En-tête */}
          <div className="border-b border-border" style={{ gridColumn: 1, gridRow: 1 }} />
          {JOURS.map((jour, i) => (
            <div
              key={jour.key}
              className="border-b border-l border-border px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-muted"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              {jour.label}
              {dates ? (
                <span className="block text-[11px] font-normal normal-case text-text-subtle">
                  {libelleDateCourte(dates[i])}
                </span>
              ) : null}
            </div>
          ))}

          {/* Grille de fond (heures) */}
          {HEURES.map((heure, hIndex) => (
            <div
              key={`label-${heure}`}
              className="border-t border-border px-2 py-1 text-xs font-medium text-text-subtle"
              style={{ gridColumn: 1, gridRow: `${hIndex * QUARTS_PAR_HEURE + 2} / span ${QUARTS_PAR_HEURE}` }}
            >
              {String(heure).padStart(2, "0")}h
            </div>
          ))}
          {JOURS.map((jour, dIndex) =>
            HEURES.map((heure, hIndex) => (
              <div
                key={`cell-${jour.key}-${heure}`}
                className="border-t border-l border-border"
                style={{
                  gridColumn: dIndex + 2,
                  gridRow: `${hIndex * QUARTS_PAR_HEURE + 2} / span ${QUARTS_PAR_HEURE}`,
                }}
              />
            ))
          )}

          {/* Pauses fixes : mêmes heures tous les jours, en arrière-plan
              (z-0) — un créneau ne peut jamais en chevaucher une, cf.
              decouperSelonPauses, mais on le montre quand même pour que le
              "trou" dans la journée s'explique de lui-même. */}
          {PAUSES.map((pause) => {
            const ligneDebut = heureVersLigne(pause.debut);
            const ligneFin = heureVersLigne(pause.fin);
            return (
              <div
                key={pause.debut}
                className="z-0 flex items-center justify-center overflow-hidden border-t border-border bg-surface-muted"
                style={{
                  gridColumn: `2 / span ${JOURS.length}`,
                  gridRow: `${ligneDebut} / ${ligneFin}`,
                }}
                title={`${pause.label} — ${pause.debut} à ${pause.fin}`}
              >
                {ligneFin - ligneDebut >= QUARTS_PAR_HEURE ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                    {pause.label} · {pause.debut}–{pause.fin}
                  </span>
                ) : null}
              </div>
            );
          })}

          {/* Créneaux, groupés par jour et par chevauchement horaire */}
          {JOURS.map((jour, dIndex) => {
            const creneauxJour = creneaux.filter((c) => c.jour === jour.key);
            const groupes = grouperChevauchements(creneauxJour);

            return groupes.map((groupe) => {
              const ligneDebut = Math.min(...groupe.map((c) => heureVersLigne(c.heureDebut)));
              const ligneFin = Math.max(...groupe.map((c) => heureVersLigne(c.heureFin)));
              const cle = groupe.map((c) => c.id).join("+");

              return (
                <div
                  key={cle}
                  // Marge réduite sous 30 min : 4 px de chaque côté sur une
                  // case de 18 px, c'est presque la moitié de la hauteur.
                  className={`relative z-10 flex gap-1 ${ligneFin - ligneDebut <= 2 ? "m-0.5" : "m-1"}`}
                  style={{ gridColumn: dIndex + 2, gridRow: `${ligneDebut} / ${ligneFin}` }}
                >
                  {groupe.map((creneau) => (
                    <CarteCreneau
                      key={creneau.id}
                      creneau={creneau}
                      variante={variante}
                      onCreneauClick={onCreneauClick}
                      quarts={heureVersQuart(creneau.heureFin) - heureVersQuart(creneau.heureDebut)}
                    />
                  ))}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
