import Link from "next/link";
import { MOCK_DASHBOARD_STATS } from "@/lib/mock-data";
import { AuditApercu } from "@/components/audit/AuditApercu";

export default function TableauDeBordScolaritePage() {
  const stats = MOCK_DASHBOARD_STATS;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text">Tableau de Bord Administratif</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Taux d&apos;occupation des salles
          </p>
          <p className="mt-2 text-2xl font-bold text-brand">{stats.tauxOccupationSalles}%</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Conflits détectés / résolus
          </p>
          <p className="mt-2 text-2xl font-bold">
            <span className="text-status-danger">{stats.conflitsDetectes}</span>
            <span className="text-text-subtle"> / </span>
            <span className="text-status-success">{stats.conflitsResolus}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Cours annulés (période)
          </p>
          <p className="mt-2 text-2xl font-bold text-text">{stats.coursAnnulesPeriode}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Journal d&apos;audit</h2>
          <Link href="/scolarite/audit" className="text-sm font-medium text-brand hover:underline">
            Voir tout
          </Link>
        </div>
        <AuditApercu />
      </div>
    </div>
  );
}
