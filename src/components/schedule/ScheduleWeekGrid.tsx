import type { Creneau, StatutCreneau } from "@/lib/types";
import { PAUSES } from "@/lib/pauses";

const JOURS: { key: Creneau["jour"]; label: string }[] = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
];

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
const CARTE_CLASSES: Record<StatutCreneau, string> = {
  normal: "border-l-4 border-status-info bg-status-info-bg",
  modifie: "border-l-4 border-status-warning bg-status-warning-bg",
  annule: "border-l-4 border-status-danger bg-status-danger-bg",
};

const LEGENDE: { statut: StatutCreneau; label: string; dot: string }[] = [
  { statut: "normal", label: "Normal", dot: "bg-status-info" },
  { statut: "modifie", label: "Modifié", dot: "bg-status-warning" },
  { statut: "annule", label: "Annulé", dot: "bg-status-danger" },
];

function heureVersQuart(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return (h - HEURE_DEBUT) * QUARTS_PAR_HEURE + Math.floor(m / 15);
}

function heureVersLigne(heure: string): number {
  return heureVersQuart(heure) + 2; // +2 : ligne 1 = en-tête des jours
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

function CarteCreneau({
  creneau,
  renderMeta,
  onCreneauClick,
}: {
  creneau: Creneau;
  renderMeta: (creneau: Creneau) => string;
  onCreneauClick?: (creneau: Creneau) => void;
}) {
  return (
    <div
      onClick={onCreneauClick ? () => onCreneauClick(creneau) : undefined}
      className={`flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-md p-2 shadow-sm ${CARTE_CLASSES[creneau.statut]} ${
        onCreneauClick ? "cursor-pointer hover:shadow-md hover:brightness-95" : ""
      }`}
    >
      <p
        className={`truncate text-sm font-semibold leading-tight text-text ${
          creneau.statut === "annule" ? "line-through opacity-70" : ""
        }`}
        title={creneau.ue.intitule}
      >
        {creneau.ue.intitule}
      </p>
      <p className="text-xs font-medium text-text-muted">
        {creneau.heureDebut}–{creneau.heureFin}
      </p>
      <p className="truncate text-xs text-text-muted" title={renderMeta(creneau)}>
        {renderMeta(creneau)}
      </p>
      {creneau.motif ? (
        <p className="truncate text-xs italic text-text-subtle" title={creneau.motif}>
          Motif : {creneau.motif}
        </p>
      ) : null}
    </div>
  );
}

// Affiche l'emploi du temps hebdomadaire — même composant pour les vues étudiant,
// enseignant et scolarité (seul le contenu des cartes de créneau varie via `renderMeta`).
export function ScheduleWeekGrid({
  creneaux,
  renderMeta,
  onCreneauClick,
}: {
  creneaux: Creneau[];
  renderMeta: (creneau: Creneau) => string;
  onCreneauClick?: (creneau: Creneau) => void;
}) {
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

      <div className="overflow-x-auto">
        {/* minmax(96px, 1fr) plutôt qu'un min-w fixe sur tout le conteneur :
            chaque jour ne descend jamais sous une largeur lisible, mais le
            défilement horizontal ne se déclenche que si l'écran est
            vraiment trop étroit pour ça (~630px), pas dès qu'il est
            simplement plus petit qu'un chiffre choisi au hasard. */}
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `56px repeat(${JOURS.length}, minmax(96px, 1fr))`,
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
                  className="relative z-10 m-1 flex gap-1"
                  style={{ gridColumn: dIndex + 2, gridRow: `${ligneDebut} / ${ligneFin}` }}
                >
                  {groupe.map((creneau) => (
                    <CarteCreneau
                      key={creneau.id}
                      creneau={creneau}
                      renderMeta={renderMeta}
                      onCreneauClick={onCreneauClick}
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
