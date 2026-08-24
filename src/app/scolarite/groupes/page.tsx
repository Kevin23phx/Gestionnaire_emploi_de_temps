"use client";

import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import type { Groupe } from "@/lib/types";
import { GroupeFormModal } from "@/components/groupes/GroupeFormModal";
import { GroupeEtudiantsModal } from "@/components/groupes/GroupeEtudiantsModal";
import { apiFetch } from "@/lib/api";

export default function GroupesPage() {
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [groupeEtudiants, setGroupeEtudiants] = useState<Groupe | null>(null);

  function majEffectif(groupeId: string, nouvelEffectif: number) {
    setGroupes((prev) =>
      (prev ?? []).map((g) => (g.id === groupeId ? { ...g, effectif: nouvelEffectif } : g))
    );
    setGroupeEtudiants((prev) => (prev && prev.id === groupeId ? { ...prev, effectif: nouvelEffectif } : prev));
  }

  useEffect(() => {
    apiFetch("/groupes")
      .then((r) => r.json())
      .then((data) => setGroupes(data.groupes));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Groupes</h1>
          {/* FR-REF-01 : import Excel/CSV à brancher sur l'API une fois disponible */}
          <p className="text-sm text-text-muted">
            Référentiel des groupes/filières de l&apos;UFR pilote
            {groupes ? ` — ${groupes.length} groupes.` : "..."}
          </p>
        </div>
        <button
          onClick={() => setModalOuvert(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau groupe
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Groupe</th>
              <th className="px-4 py-2 font-medium">Filière</th>
              <th className="px-4 py-2 font-medium">Niveau</th>
              <th className="px-4 py-2 font-medium">Effectif</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(groupes ?? []).map((groupe) => (
              <tr key={groupe.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-text">{groupe.nom}</td>
                <td className="px-4 py-2 text-text-muted">{groupe.filiere}</td>
                <td className="px-4 py-2 text-text-muted">{groupe.niveau}</td>
                <td className="px-4 py-2 text-text-muted">{groupe.effectif} étudiants</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setGroupeEtudiants(groupe)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-xs font-medium text-text hover:bg-surface-muted"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Étudiants
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {groupes === null ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
        ) : null}
      </div>

      {modalOuvert ? (
        <GroupeFormModal
          onClose={() => setModalOuvert(false)}
          onSave={(groupe) => {
            setGroupes((prev) => [...(prev ?? []), groupe]);
            setModalOuvert(false);
            setGroupeEtudiants(groupe);
          }}
        />
      ) : null}

      {groupeEtudiants ? (
        <GroupeEtudiantsModal
          groupe={groupeEtudiants}
          onClose={() => setGroupeEtudiants(null)}
          onEffectifChange={majEffectif}
        />
      ) : null}
    </div>
  );
}
