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
  // Deux rouges, deux messages distincts : « cette séance-ci » n'est pas
  // « ce cours ». Les confondre dirait à l'étudiant que son cours est
  // supprimé alors que l'enseignant est simplement absent un jour (RM-10).
  annule_seance: { carte: "border-l-4 border-status-danger bg-status-danger-bg", badge: "Séance annulée" },
  annule: { carte: "border-l-4 border-status-danger bg-status-danger-bg", badge: "Cours annulé" },
};

function Seance({ seance }: { seance: SeancePublique }) {
  const { carte, badge } = APPARENCE[seance.statut];
  const barre = seance.statut === "annule" || seance.statut === "annule_seance";

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
      <p className="text-xs text-text-muted">
        {seance.salle.nom} · {seance.salle.batiment}
      </p>
      <p className="text-xs text-text-muted">{seance.enseignant}</p>
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

  // Les bornes de navigation viennent de la période académique de l'UFR :
  // laisser feuilleter à l'infini des semaines vides ferait croire à un
  // programme inexistant (FR-REF-16). Une semaine est atteignable dès
  // qu'elle CHEVAUCHE la période — on compare donc son samedi au début de
  // période et son lundi à la fin, jamais deux fois la même borne.
  const samediPrecedente = versIso(ajouterJours(depuisIso(precedente), 5));
  const peutReculer = semaine.periodeDebut === null || samediPrecedente >= semaine.periodeDebut;
  const peutAvancer = semaine.periodeFin === null || suivante <= semaine.periodeFin;

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
          disabled={!peutReculer}
          aria-label="Semaine précédente"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold text-text">
            {libelleSemaine(semaine.lundi, semaine.samedi)}
          </p>
          {semaine.periodeLibelle ? (
            <p className="truncate text-xs text-text-subtle">{semaine.periodeLibelle}</p>
          ) : null}
        </div>
        <button
          onClick={() => onSemaineChange(suivante)}
          disabled={!peutAvancer}
          aria-label="Semaine suivante"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {semaineVide ? (
        <p className="px-4 py-10 text-center text-sm text-text-muted">
          Aucun cours cette semaine-là.
        </p>
      ) : (
        // Une colonne par jour au-delà de md, une pile de sections en
        // dessous : sur téléphone, six colonnes rendraient chaque intitulé
        // illisible (cahier des charges §1.4 — le parc est dominé par
        // l'Android d'entrée de gamme).
        <div className="grid gap-3 p-3 md:grid-cols-3 lg:grid-cols-6">
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
