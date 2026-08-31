"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";
import { apiFetch } from "@/lib/api";

// FR-ADMIN-03 : même table que /scolarite/audit, mais transverse à toutes
// les UFR — le filtrage par UFR reste appliqué côté API selon le rôle
// authentifié (AuditService.list), jamais reconstruit ici.
export default function JournalAuditAdminPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    apiFetch("/audit")
      .then((r) => r.json())
      .then((data) => setEntries([...data.entries].reverse()));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text">Journal d&apos;audit — toutes les UFR</h1>
      <div className="rounded-xl border border-border bg-surface">
        {entries ? (
          <AuditTable entries={entries} />
        ) : (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
        )}
      </div>
    </div>
  );
}
