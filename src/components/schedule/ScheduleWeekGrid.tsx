import type { Creneau, StatutCreneau } from "@/lib/types";
import { CreneauStatusBadge } from "@/components/ui/StatusBadge";

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

const CARTE_CLASSES: Record<StatutCreneau, string> = {
  normal: "border-status-info bg-status-info-bg/40",
  modifie: "border-status-warning bg-status-warning-bg/50",
  annule: "border-status-danger bg-status-danger-bg/40",
};

function heureVersLigne(heure: string): number {
  const [h] = heure.split(":").map(Number);
  return h - HEURE_DEBUT + 2; // +2 : ligne 1 = en-tête des jours
}

// Affiche l'emploi du temps hebdomadaire — même composant pour les vues étudiant,
// enseignant et scolarité (seul le contenu des cartes de créneau varie via `renderMeta`).
export function ScheduleWeekGrid({
  creneaux,
  renderMeta,
}: {
  creneaux: Creneau[];
  renderMeta: (creneau: Creneau) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: `64px repeat(${JOURS.length}, 1fr)`,
          gridTemplateRows: `auto repeat(${HEURES.length}, 56px)`,
        }}
      >
        {/* En-tête */}
        <div className="border-b border-border" style={{ gridColumn: 1, gridRow: 1 }} />
        {JOURS.map((jour, i) => (
          <div
            key={jour.key}
            className="border-b border-l border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted"
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {jour.label}
          </div>
        ))}

        {/* Grille de fond (heures) */}
        {HEURES.map((heure, hIndex) => (
          <div
            key={`label-${heure}`}
            className="border-t border-border px-2 py-1 text-xs text-text-subtle"
            style={{ gridColumn: 1, gridRow: hIndex + 2 }}
          >
            {String(heure).padStart(2, "0")}:00
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
              className={`relative z-10 m-1 overflow-hidden rounded-lg border p-2 text-xs ${CARTE_CLASSES[creneau.statut]}`}
              style={{ gridColumn: dIndex + 2, gridRow: `${ligneDebut} / ${ligneFin}` }}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="font-semibold text-text">
                  {creneau.heureDebut}–{creneau.heureFin}
                </span>
                <CreneauStatusBadge statut={creneau.statut} />
              </div>
              <p
                className={`font-medium text-text ${creneau.statut === "annule" ? "line-through opacity-70" : ""}`}
              >
                {creneau.ue.intitule}
              </p>
              <p className="text-text-muted">{renderMeta(creneau)}</p>
              {creneau.motif ? (
                <p className="mt-1 text-text-subtle">Motif : {creneau.motif}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
