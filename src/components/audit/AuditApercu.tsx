"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";
import { chargerJson } from "@/lib/api";

// Aperçu des 5 dernières entrées, récupérées via l'API plutôt qu'un import
// statique — voir README pour pourquoi (partage d'état entre Pages et Route
// Handlers non garanti par Turbopack en dev).
export function AuditApercu() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    // [V8.6] `chargerJson` et non `apiFetch(...).then(r => r.json())` :
    // une session expirée faisait répondre 401 `{"erreur": ...}`, donc un
    // corps SANS `entries`, et le `.slice` plantait toute la page sur un
    // TypeError. Voir src/lib/api.ts pour le détail de l'incident.
    //
    // L'API renvoie déjà les entrées de la plus récente à la plus
    // ancienne : prendre les 5 PREMIÈRES. L'ancien `slice(-5).reverse()`
    // affichait en réalité les 5 plus VIEILLES sous le titre « dernières
    // entrées » — l'ordre de l'API avait changé sans que cet appel suive.
    chargerJson<{ entries?: AuditEntry[] }>("/audit").then((data) =>
      setEntries((data?.entries ?? []).slice(0, 5))
    );
  }, []);

  if (!entries) {
    return <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>;
  }

  return <AuditTable entries={entries} />;
}
