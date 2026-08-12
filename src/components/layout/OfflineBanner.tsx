"use client";

import { WifiOff } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";

function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  const jour = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
  const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${jour} à ${heure.replace(":", "h")}`;
}

// FR-OFF-02 : bandeau standard, texte identique sur tous les écrans, visible uniquement hors-ligne.
export function OfflineBanner() {
  const { enLigne, derniereSynchronisation } = useSyncStatus();

  if (enLigne || !derniereSynchronisation) return null;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-6 py-2 text-sm text-text-muted">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span>
        Hors-ligne — dernière mise à jour le {formatDateHeure(derniereSynchronisation)}
      </span>
    </div>
  );
}
