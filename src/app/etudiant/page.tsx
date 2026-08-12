import { Bell } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { MOCK_CRENEAUX, MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";

export default async function EtudiantPage() {
  const session = await getSession();
  // FR-EDT-04/06 : un étudiant ne voit que l'emploi du temps de son propre groupe.
  const creneaux = MOCK_CRENEAUX.filter((c) => c.groupe.id === session?.groupeId);
  const nonLues = MOCK_NOTIFICATIONS.filter((n) => !n.lue).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Emploi du temps</h1>
          <p className="text-sm text-text-muted">
            {creneaux[0]?.groupe.nom ?? "Votre groupe"}
          </p>
        </div>
        <Link
          href="/etudiant/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted"
        >
          <Bell className="h-4 w-4 text-text-muted" aria-hidden="true" />
          {nonLues > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-semibold text-white">
              {nonLues}
            </span>
          ) : null}
        </Link>
      </div>

      <ScheduleWeekGrid
        creneaux={creneaux}
        renderMeta={(c) => `${c.salle.nom} · ${c.enseignant.prenom} ${c.enseignant.nom}`}
      />
    </div>
  );
}
