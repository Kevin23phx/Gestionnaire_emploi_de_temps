import { MOCK_CRENEAUX_SCOLARITE } from "@/lib/mock-data";
import { detecterConflits } from "@/lib/conflict-detection";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";
import { ConflictPanel } from "@/components/conflicts/ConflictPanel";

export default function PlanningScolaritePage() {
  const conflits = detecterConflits(MOCK_CRENEAUX_SCOLARITE);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text">Emploi du temps — UFR pilote</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ScheduleWeekGrid
          creneaux={MOCK_CRENEAUX_SCOLARITE}
          renderMeta={(c) => `${c.salle.nom} · ${c.groupe.nom} · ${c.enseignant.prenom} ${c.enseignant.nom}`}
        />
        <ConflictPanel conflits={conflits} />
      </div>
    </div>
  );
}
