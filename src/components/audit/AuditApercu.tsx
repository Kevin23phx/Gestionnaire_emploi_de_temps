"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";

// Aperçu des 5 dernières entrées, récupérées via l'API plutôt qu'un import
// statique — voir README pour pourquoi (partage d'état entre Pages et Route
// Handlers non garanti par Turbopack en dev).
export function AuditApercu() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries.slice(-5).reverse()));
  }, []);

  if (!entries) {
    return <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>;
  }

  return <AuditTable entries={entries} />;
}
