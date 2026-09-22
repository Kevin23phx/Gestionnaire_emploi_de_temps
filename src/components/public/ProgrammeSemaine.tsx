"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProgrammePublic, SeancePublique, StatutSeance } from "@/lib/types";
import { JOURS_SEMAINE, ajouterJours, datesDeLaSemaine, depuisIso, estAujourdhui, libelleDateCourte, libelleSemaine, versIso } from "@/lib/semaines";

// [V3] FR-EDT-09 — la grille est rattachée à une SEMAINE CALENDAIRE.
//
// Une grille « type » (lundi → samedi, sans dates) ne peut pas représenter
// une annulation ponctuelle : « Algo est annulé » y serait vrai toutes les
// semaines. Or c'est devenu le cas courant depuis que le signalement passe
// par un appel téléphonique suivi d'une annulation datée (FR-EDT-07). Sans
// dates à l'écran, l'annulation existerait en base sans être perceptible.

const APPARENCE: Record<StatutSeance, { carte: string; badge: string | null }> = {
  normal: { carte: "border-l-4 border-status-info bg-status-info-bg", badge: null },
  modifie: { carte: "border-l-4 border-status-warning bg-status-warning-bg", badge: "Modifié" },
  // [V4] Un seul « annulé » : chaque séance porte sa date, l'annuler
  // n'annule que celle-là. La semaine suivante a son propre programme.
  annule: { carte: "border-l-4 border-status-danger bg-status-danger-bg", badge: "Annulé" },
};

function Seance({ seance }: { seance: SeancePublique }) {
  const { carte, badge } = APPARENCE[seance.statut];
  const barre = seance.statut === "annule";

  return (
    <div className={`flex flex-col gap-1 rounded-lg p-3 shadow-sm ${carte}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text-muted">
          {seance.heureDebut}–{seance.heureFin}
        </p>
        {badge ? (
          <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-muted">
            {badge}
          </span>
        ) : null}
      </div>
      <p className={`text-sm font-semibold leading-tight text-text ${barre ? "line-through opacity-70" : ""}`}>
        {seance.ue.intitule}
      </p>
      <p className="text-xs text-text-muted">{seance.salle.nom}</p>
      <p className="text-xs text-text-muted">{seance.enseignant}</p>
      {/* [V8.1] Dit à qui la séance s'adresse. Affiché seulement quand elle
          est affectée : un cours de tronc commun n'a rien à préciser, et
          étiqueter chaque ligne « toute la promotion » noierait justement
          celles qui comptent. C'est ce marqueur qui permet à l'étudiant de
          distinguer, sur sa propre feuille, ce qu'il suit avec toute sa
          promotion de ce qu'il suit avec sa seule spécialité. */}
      {seance.specialite ? (
        <p className="text-xs font-medium text-brand">{seance.specialite}</p>
      ) : null}
      {seance.motif ? <p className="text-xs italic text-text-subtle">Motif : {seance.motif}</p> : null}
    </div>
  );
}

export function ProgrammeSemaine({
  programme,
  onSemaineChange,
}: {
  programme: ProgrammePublic;
  onSemaineChange: (lundiIso: string) => void;
}) {
  const { semaine, seances } = programme;
  const dates = datesDeLaSemaine(semaine.lundi);

  const precedente = versIso(ajouterJours(depuisIso(semaine.lundi), -7));
  const suivante = versIso(ajouterJours(depuisIso(semaine.lundi), 7));

  // [V4] Aucune borne : le programme est publié semaine par semaine, il n'y
  // a plus de période à respecter. Le visiteur navigue librement ; une
  // semaine sans programme le dit simplement, ce qui est l'information
  // juste — « pas encore publié » et « erreur » ne se ressemblent pas.

  const parJour = JOURS_SEMAINE.map((jour, i) => ({
    jour,
    date: dates[i],
    seances: seances
      .filter((s) => s.date === dates[i])
      .sort((a, b) => (a.heureDebut < b.heureDebut ? -1 : 1)),
  }));

  const semaineVide = seances.length === 0;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <button
          onClick={() => onSemaineChange(precedente)}
          aria-label="Semaine précédente"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold text-text">
            {libelleSemaine(semaine.lundi, semaine.samedi)}
          </p>
          {!semaine.publie ? (
            <p className="truncate text-xs text-text-subtle">Programme pas encore publié</p>
          ) : null}
        </div>
        <button
          onClick={() => onSemaineChange(suivante)}
          aria-label="Semaine suivante"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {semaineVide ? (
        // Le programme sort en fin de semaine pour la suivante : une semaine
        // vide n'est pas une anomalie, c'est une semaine dont la scolarité
        // n'a pas encore fait sortir l'emploi du temps.
        <p className="px-4 py-10 text-center text-sm text-text-muted">
          Le programme de cette semaine n&apos;a pas encore été publié.
        </p>
      ) : (
        // Une colonne par jour au-delà de md, une pile de sections en
        // dessous : sur téléphone, six colonnes rendraient chaque intitulé
        // illisible (cahier des charges §1.4 — le parc est dominé par
        // l'Android d'entrée de gamme).
        <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3 lg:grid-cols-6">
          {parJour.map(({ jour, date, seances: duJour }) => (
            <section key={jour} className={duJour.length === 0 ? "hidden md:block" : ""}>
              <h3
                className={`mb-2 flex items-baseline justify-between gap-1 border-b border-border pb-1 text-xs font-semibold uppercase tracking-wide ${
                  estAujourdhui(date) ? "text-brand" : "text-text-subtle"
                }`}
              >
                <span>{jour}</span>
                <span className="font-normal normal-case">{libelleDateCourte(date)}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {duJour.map((s) => (
                  <Seance key={`${s.id}-${s.date}`} seance={s} />
                ))}
                {duJour.length === 0 ? (
                  <p className="py-2 text-center text-xs text-text-subtle">—</p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
