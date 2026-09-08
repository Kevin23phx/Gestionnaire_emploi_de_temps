import type { GraviteConflit, StatutCreneau } from "@/lib/types";

type Tone = "info" | "warning" | "danger" | "success" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  info: "bg-status-info-bg text-status-info",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
  success: "bg-status-success-bg text-status-success",
  neutral: "bg-surface-muted text-text-muted",
};

export function Badge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

// Code couleur appliqué de façon identique sur toutes les vues d'emploi du temps (§ décision de cadrage).
const CRENEAU_STATUT: Record<StatutCreneau, { label: string; tone: Tone }> = {
  normal: { label: "Normal", tone: "info" },
  modifie: { label: "Modifié", tone: "warning" },
  // [V3] « Annulé » tout court désigne l'annulation de TOUTE la période
  // (FR-EDT-03). L'annulation d'une séance datée (FR-EDT-07) a son propre
  // libellé là où elle s'affiche, pour que RM-10 reste lisible à l'écran.
  annule: { label: "Annulé (toute la période)", tone: "danger" },
};

export function CreneauStatusBadge({ statut }: { statut: StatutCreneau }) {
  const { label, tone } = CRENEAU_STATUT[statut];
  return <Badge tone={tone} label={label} />;
}

const CONFLIT_GRAVITE: Record<GraviteConflit, { label: string; tone: Tone }> = {
  bloquant: { label: "Conflit bloquant", tone: "danger" },
  avertissement: { label: "Avertissement", tone: "warning" },
};

export function ConflitGraviteBadge({ gravite }: { gravite: GraviteConflit }) {
  const { label, tone } = CONFLIT_GRAVITE[gravite];
  return <Badge tone={tone} label={label} />;
}
