import Link from "next/link";
import { apiFetchServer } from "@/lib/api-server";
import type { DashboardStats, UfrAvecGestionnaire } from "@/lib/types";

const STATS_VIDES: DashboardStats = {
  tauxOccupationSalles: 0,
  conflitsDetectes: 0,
  conflitsResolus: 0,
  coursAnnulesPeriode: 0,
};

// FR-ADMIN-03 : vue de supervision transverse à tous les établissements, en lecture
// seule — l'Admin n'a ici aucune action de gestion du référentiel/planning
// (déléguée aux Gestionnaires), seulement un aperçu global + le statut des
// comptes Gestionnaire (cf. /admin/ufrs pour la gestion elle-même).
export default async function SupervisionAdminPage() {
  const [resStats, resUfrs] = await Promise.all([apiFetchServer("/dashboard/stats"), apiFetchServer("/ufrs")]);
  const stats: DashboardStats = resStats.ok ? await resStats.json() : STATS_VIDES;
  const ufrs: UfrAvecGestionnaire[] = resUfrs.ok ? (await resUfrs.json()).ufrs : [];

  const gestionnairesActifs = ufrs.filter((u) => u.gestionnaire?.active).length;
  const gestionnairesEnAttente = ufrs.filter((u) => u.gestionnaire && !u.gestionnaire.active).length;
  const sansGestionnaire = ufrs.filter((u) => !u.gestionnaire).length;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text">Supervision — tous les établissements</h1>

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
          <h2 className="text-sm font-semibold text-text">Établissements ({ufrs.length})</h2>
          <Link href="/admin/ufrs" className="text-sm font-medium text-brand hover:underline">
            Gérer les établissements
          </Link>
        </div>
        <div className="flex flex-wrap gap-4 px-4 py-3 text-sm">
          <span className="text-status-success">{gestionnairesActifs} gestionnaire(s) actif(s)</span>
          <span className="text-status-warning">{gestionnairesEnAttente} en attente d&apos;activation</span>
          {sansGestionnaire > 0 ? (
            <span className="text-status-danger">{sansGestionnaire} établissement(s) sans gestionnaire</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
