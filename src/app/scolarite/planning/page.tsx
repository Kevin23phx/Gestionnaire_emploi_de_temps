"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  MOCK_CRENEAUX_SCOLARITE,
  MOCK_ENSEIGNANTS,
  MOCK_GROUPES,
  MOCK_SALLES,
  MOCK_UNITES_ENSEIGNEMENT,
} from "@/lib/mock-data";
import { detecterConflits } from "@/lib/conflict-detection";
import type { Creneau, Enseignant } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";
import { ConflictPanel } from "@/components/conflicts/ConflictPanel";
import { CreneauFormModal } from "@/components/planning/CreneauFormModal";

type EtatModal = { mode: "creation" } | { mode: "edition"; creneau: Creneau } | null;

export default function PlanningScolaritePage() {
  const [creneaux, setCreneaux] = useState<Creneau[]>(MOCK_CRENEAUX_SCOLARITE);
  const [enseignants, setEnseignants] = useState<Enseignant[]>(MOCK_ENSEIGNANTS);
  const [modal, setModal] = useState<EtatModal>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const conflits = useMemo(() => detecterConflits(creneaux), [creneaux]);

  function ouvrirEdition(creneauId: string) {
    const cible = creneaux.find((c) => c.id === creneauId);
    if (cible) setModal({ mode: "edition", creneau: cible });
  }

  function handleSave(resultat: Creneau, motifDerogation: string | null) {
    setCreneaux((prev) => {
      const existeDeja = prev.some((c) => c.id === resultat.id);
      if (existeDeja) {
        return prev.map((c) => (c.id === resultat.id ? resultat : c));
      }
      const id = `c-${crypto.randomUUID().slice(0, 8)}`;
      return [...prev, { ...resultat, id }];
    });

    setConfirmation(
      motifDerogation
        ? `Créneau enregistré malgré un conflit — dérogation journalisée : "${motifDerogation}".`
        : "Créneau enregistré."
    );
    setModal(null);
    setTimeout(() => setConfirmation(null), 5000);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Emploi du temps — UFR pilote</h1>
        <button
          onClick={() => setModal({ mode: "creation" })}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau créneau
        </button>
      </div>

      {confirmation ? (
        <p className="mb-4 rounded-lg bg-status-success-bg px-3 py-2 text-sm text-status-success">
          {confirmation}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ScheduleWeekGrid
          creneaux={creneaux}
          renderMeta={(c) => `${c.salle.nom} · ${c.groupe.nom} · ${c.enseignant.prenom} ${c.enseignant.nom}`}
          onCreneauClick={(c) => ouvrirEdition(c.id)}
        />
        <ConflictPanel conflits={conflits} onCorriger={ouvrirEdition} />
      </div>

      {modal ? (
        <CreneauFormModal
          creneau={modal.mode === "edition" ? modal.creneau : null}
          creneauxExistants={
            modal.mode === "edition" ? creneaux.filter((c) => c.id !== modal.creneau.id) : creneaux
          }
          enseignants={enseignants}
          groupes={MOCK_GROUPES}
          salles={MOCK_SALLES}
          unitesEnseignement={MOCK_UNITES_ENSEIGNEMENT}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onEnseignantCree={(e) => setEnseignants((prev) => [...prev, e])}
        />
      ) : null}
    </div>
  );
}
