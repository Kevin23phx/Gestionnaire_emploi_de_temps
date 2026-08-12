import type { AuditEntry } from "@/lib/types";

function formatDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

// FR-AUD-01/02 : lecture seule, append-only côté API (INV-04) — aucune action
// d'édition ou de suppression n'apparaît jamais sur cette table.
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-text-subtle">
          <th className="px-4 py-2 font-medium">Utilisateur</th>
          <th className="px-4 py-2 font-medium">Date &amp; heure</th>
          <th className="px-4 py-2 font-medium">Action</th>
          <th className="px-4 py-2 font-medium">Motif</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entree) => (
          <tr key={entree.id} className="border-t border-border">
            <td className="px-4 py-2 text-text">{entree.auteur}</td>
            <td className="px-4 py-2 font-mono text-xs text-text-muted">
              {formatDateHeure(entree.dateHeure)}
            </td>
            <td className="px-4 py-2 text-text">{entree.action}</td>
            <td className="px-4 py-2 text-text-muted">{entree.motif}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
