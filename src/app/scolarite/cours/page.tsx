"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { UniteEnseignement } from "@/lib/types";
import { CoursFormModal } from "@/components/cours/CoursFormModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresUrl, valeursDistinctes } from "@/lib/filtres";

export default function CoursPage() {
  const [cours, setCours] = useState<UniteEnseignement[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

  // Même motivation que pour les salles : « être sûr que ce cours existe »
  // avant d'en créer un doublon (FR-FILT-04).
  const tous = useMemo(() => cours ?? [], [cours]);
  const filtres = useMemo(
    () =>
      tous.filter(
        (ue) =>
          correspond(valeur("q"), ue.intitule, ue.code) &&
          (!valeur("niveau") || ue.niveau === valeur("niveau"))
      ),
    [tous, valeur]
  );

  useEffect(() => {
    apiFetch("/cours")
      .then((r) => r.json())
      .then((data) => setCours(data.cours));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Cours</h1>
          {/* FR-REF-01 : import Excel/CSV à brancher sur l'API une fois disponible */}
          <p className="text-sm text-text-muted">
            Référentiel des unités d&apos;enseignement de votre établissement
            {cours ? ` — ${cours.length} cours.` : "..."}
          </p>
        </div>
        <button
          onClick={() => setModalOuvert(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau cours
        </button>
      </div>

      <BarreFiltres
        placeholder="Rechercher un cours par intitulé ou par code..."
        filtres={[{ cle: "niveau", label: "Niveau", options: valeursDistinctes(tous, (ue) => ue.niveau) }]}
        valeur={valeur}
        definir={definir}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Intitulé</th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((ue) => (
              <tr key={ue.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-text">{ue.code}</td>
                <td className="px-4 py-2 text-text-muted">
                  {ue.intitule} <span className="text-text-subtle">({ue.niveau})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cours === null ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
        ) : filtres.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">
            {tous.length === 0 ? "Aucun cours dans le référentiel." : "Aucun cours ne correspond à ces filtres."}
          </p>
        ) : null}
      </div>

      {modalOuvert ? (
        <CoursFormModal
          onClose={() => setModalOuvert(false)}
          onSave={(ue) => {
            setCours((prev) => [...(prev ?? []), ue]);
            setModalOuvert(false);
          }}
        />
      ) : null}
    </div>
  );
}
