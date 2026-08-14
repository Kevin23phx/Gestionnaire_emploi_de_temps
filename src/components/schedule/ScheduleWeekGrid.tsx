import type { Creneau, StatutCreneau } from "@/lib/types";

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
const HAUTEUR_LIGNE = 72;

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

function heureVersLigne(heure: string): number {
  const [h] = heure.split(":").map(Number);
  return h - HEURE_DEBUT + 2; // +2 : ligne 1 = en-tête des jours
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
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[760px]"
          style={{
            gridTemplateColumns: `56px repeat(${JOURS.length}, 1fr)`,
            gridTemplateRows: `auto repeat(${HEURES.length}, ${HAUTEUR_LIGNE}px)`,
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
              style={{ gridColumn: 1, gridRow: hIndex + 2 }}
            >
              {String(heure).padStart(2, "0")}h
            </div>
          ))}
          {JOURS.map((jour, dIndex) =>
            HEURES.map((heure, hIndex) => (
              <div
                key={`cell-${jour.key}-${heure}`}
                className="border-t border-l border-border"
                style={{ gridColumn: dIndex + 2, gridRow: hIndex + 2 }}
              />
            ))
          )}

          {/* Créneaux */}
          {creneaux.map((creneau) => {
            const dIndex = JOURS.findIndex((j) => j.key === creneau.jour);
            if (dIndex === -1) return null;
            const ligneDebut = heureVersLigne(creneau.heureDebut);
            const ligneFin = heureVersLigne(creneau.heureFin);

            return (
              <div
                key={creneau.id}
                onClick={onCreneauClick ? () => onCreneauClick(creneau) : undefined}
                className={`relative z-10 m-1 flex flex-col gap-0.5 overflow-hidden rounded-md p-2 shadow-sm ${CARTE_CLASSES[creneau.statut]} ${
                  onCreneauClick ? "cursor-pointer hover:shadow-md hover:brightness-95" : ""
                }`}
                style={{ gridColumn: dIndex + 2, gridRow: `${ligneDebut} / ${ligneFin}` }}
              >
                <p
                  className={`text-sm font-semibold leading-tight text-text ${
                    creneau.statut === "annule" ? "line-through opacity-70" : ""
                  }`}
                >
                  {creneau.ue.intitule}
                </p>
                <p className="text-xs font-medium text-text-muted">
                  {creneau.heureDebut}–{creneau.heureFin}
                </p>
                <p className="truncate text-xs text-text-muted">{renderMeta(creneau)}</p>
                {creneau.motif ? (
                  <p className="truncate text-xs italic text-text-subtle">Motif : {creneau.motif}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
