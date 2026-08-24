import { Bell } from "lucide-react";
import Link from "next/link";
import { apiFetchServer } from "@/lib/api-server";
import type { Creneau, NotificationItem } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";

export default async function EtudiantPage() {
  // FR-EDT-04/06 : le périmètre (un étudiant ne voit que son propre groupe)
  // est appliqué côté backend (INT-06, PlanningService.list) — aucun filtre
  // à refaire ici.
  const [reponseCreneaux, reponseNotifications] = await Promise.all([
    apiFetchServer("/creneaux"),
    apiFetchServer("/notifications"),
  ]);
  const { creneaux }: { creneaux: Creneau[] } = reponseCreneaux.ok
    ? await reponseCreneaux.json()
    : { creneaux: [] };
  const { notifications }: { notifications: NotificationItem[] } = reponseNotifications.ok
    ? await reponseNotifications.json()
    : { notifications: [] };
  const nonLues = notifications.filter((n) => !n.lue).length;

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
        variante="salle-enseignant"
      />
    </div>
  );
}
