"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Salle, StructureGestionnaire, TypeUsageSalle } from "@/lib/types";
import { SalleFormModal } from "@/components/salles/SalleFormModal";

const USAGE_LABEL: Record<TypeUsageSalle, string> = {
  propre: "Propre à l'UFR",
  commune: "Commune",
  louee: "Louée",
  gratuite: "Gratuite",
};

// Seule valeur possible pour le MVP (RM-05) — la table est prête à accueillir
// d'autres structures (DEP, etc.) dès qu'elles seront identifiées, sans
// jamais laisser un code technique brut fuiter dans l'interface.
const GESTIONNAIRE_LABEL: Record<StructureGestionnaire, string> = {
  UFR_PILOTE: "UFR pilote",
};

export default function SallesPage() {
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);

  useEffect(() => {
    fetch("/api/salles")
      .then((r) => r.json())
      .then((data) => setSalles(data.salles));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Salles</h1>
          {/* FR-REF-01 : import Excel/CSV à brancher sur l'API une fois disponible */}
          <p className="text-sm text-text-muted">
            Référentiel des salles de l&apos;UFR pilote
            {salles ? ` — ${salles.length} salles.` : "..."}
          </p>
        </div>
        <button
          onClick={() => setModalOuvert(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouvelle salle
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Salle</th>
              <th className="px-4 py-2 font-medium">Bâtiment</th>
              <th className="px-4 py-2 font-medium">Capacité</th>
              <th className="px-4 py-2 font-medium">Gestionnaire</th>
              <th className="px-4 py-2 font-medium">Usage</th>
            </tr>
          </thead>
          <tbody>
            {(salles ?? []).map((salle) => (
              <tr key={salle.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-text">{salle.nom}</td>
                <td className="px-4 py-2 text-text-muted">{salle.batiment}</td>
                <td className="px-4 py-2 text-text-muted">{salle.capacite} pl.</td>
                <td className="px-4 py-2 text-text-muted">
                  {GESTIONNAIRE_LABEL[salle.structureGestionnaire]}
                </td>
                <td className="px-4 py-2 text-text-muted">{USAGE_LABEL[salle.typeUsage]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {salles === null ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
        ) : null}
      </div>

      {modalOuvert ? (
        <SalleFormModal
          onClose={() => setModalOuvert(false)}
          onSave={(salle) => {
            setSalles((prev) => [...(prev ?? []), salle]);
            setModalOuvert(false);
          }}
        />
      ) : null}
    </div>
  );
}
