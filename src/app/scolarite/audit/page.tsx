import { Download } from "lucide-react";
import { MOCK_AUDIT } from "@/lib/mock-data";
import { AuditTable } from "@/components/audit/AuditTable";

export default function JournalAuditPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Journal d&apos;audit</h1>
        {/* FR-AUD-02 : export à brancher sur l'API une fois disponible */}
        <button className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-muted">
          <Download className="h-4 w-4" aria-hidden="true" />
          Exporter
        </button>
      </div>
      <div className="rounded-xl border border-border bg-surface">
        <AuditTable entries={MOCK_AUDIT} />
      </div>
    </div>
  );
}
