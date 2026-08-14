"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { MOCK_CRENEAUX_SCOLARITE, MOCK_GROUPES, MOCK_UNITES_ENSEIGNEMENT } from "@/lib/mock-data";
import { detecterConflits } from "@/lib/conflict-detection";
import type { Creneau, Enseignant, Salle } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";
import { ConflictPanel } from "@/components/conflicts/ConflictPanel";
import { CreneauFormModal } from "@/components/planning/CreneauFormModal";

type EtatModal = { mode: "creation" } | { mode: "edition"; creneau: Creneau } | null;

export default function PlanningScolaritePage() {
  const [creneaux, setCreneaux] = useState<Creneau[]>(MOCK_CRENEAUX_SCOLARITE);
  const [enseignants, setEnseignants] = useState<Enseignant[] | null>(null);
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [modal, setModal] = useState<EtatModal>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/enseignants")
      .then((r) => r.json())
      .then((data) => setEnseignants(data.enseignants));
    fetch("/api/salles")
      .then((r) => r.json())
      .then((data) => setSalles(data.salles));
  }, []);

  const conflits = useMemo(() => detecterConflits(creneaux), [creneaux]);
  const donneesPretes = enseignants !== null && salles !== null;

  function ouvrirEdition(creneauId: string) {
    if (!donneesPretes) return;
    const cible = creneaux.find((c) => c.id === creneauId);
    if (cible) setModal({ mode: "edition", creneau: cible });
  }

  function handleSave(resultats: Creneau[], motifDerogation: string | null) {
    setCreneaux((prev) => {
      let suivant = prev;
      for (const resultat of resultats) {
        const existeDeja = suivant.some((c) => c.id === resultat.id);
        suivant = existeDeja
          ? suivant.map((c) => (c.id === resultat.id ? resultat : c))
          : [...suivant, { ...resultat, id: `c-${crypto.randomUUID().slice(0, 8)}` }];
      }
      return suivant;
    });

    const pluriel = resultats.length > 1 ? `${resultats.length} créneaux enregistrés` : "Créneau enregistré";
    setConfirmation(
      motifDerogation
        ? `${pluriel} malgré un conflit — dérogation journalisée : "${motifDerogation}".`
        : `${pluriel}.`
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
          disabled={!donneesPretes}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
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

      {modal && enseignants && salles ? (
        <CreneauFormModal
          creneau={modal.mode === "edition" ? modal.creneau : null}
          creneauxExistants={
            modal.mode === "edition" ? creneaux.filter((c) => c.id !== modal.creneau.id) : creneaux
          }
          enseignants={enseignants}
          groupes={MOCK_GROUPES}
          salles={salles}
          unitesEnseignement={MOCK_UNITES_ENSEIGNEMENT}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onEnseignantCree={(e) => setEnseignants((prev) => [...(prev ?? []), e])}
        />
      ) : null}
    </div>
  );
}
