import type { GraviteConflit, StatutCreneau, StatutDemande } from "@/lib/types";

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
  annule: { label: "Annulé", tone: "danger" },
};

export function CreneauStatusBadge({ statut }: { statut: StatutCreneau }) {
  const { label, tone } = CRENEAU_STATUT[statut];
  return <Badge tone={tone} label={label} />;
}

const DEMANDE_STATUT: Record<StatutDemande, { label: string; tone: Tone }> = {
  en_attente: { label: "En attente", tone: "warning" },
  validee: { label: "Validée", tone: "success" },
  refusee: { label: "Refusée", tone: "danger" },
};

export function DemandeStatusBadge({ statut }: { statut: StatutDemande }) {
  const { label, tone } = DEMANDE_STATUT[statut];
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
