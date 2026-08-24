import Link from "next/link";
import { CalendarX } from "lucide-react";
import { getSession } from "@/lib/session";
import { apiFetchServer } from "@/lib/api-server";
import type { Creneau } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";

export default async function EnseignantPage() {
  const session = await getSession();
  // FR-EDT-05/06 : le périmètre (un enseignant ne voit que son propre
  // planning) est appliqué côté backend (INT-06, PlanningService.list).
  const reponse = await apiFetchServer("/creneaux");
  const { creneaux }: { creneaux: Creneau[] } = reponse.ok ? await reponse.json() : { creneaux: [] };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Mon Planning</h1>
          <p className="text-sm text-text-muted">
            {session ? `${session.prenom} ${session.nom}` : ""}
          </p>
        </div>
        <Link
          href="/enseignant/demandes"
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <CalendarX className="h-4 w-4" aria-hidden="true" />
          Signaler une absence / demander un report
        </Link>
      </div>

      <ScheduleWeekGrid
        creneaux={creneaux}
        variante="salle-groupe"
      />
    </div>
  );
}
