"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { UniteEnseignement } from "@/lib/types";
import { CoursFormModal } from "@/components/cours/CoursFormModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresManuel } from "@/lib/filtres";

// [2026-09] Retour des gestionnaires post-présentation : rien ne charge
// avant un clic explicite sur "Actualiser" — comme le reste du référentiel
// gestionnaire.
//
// [2026-09] Retour du porteur de projet : un cours n'est plus rattaché à un
// département. Le tableau n'a donc plus de colonne « Départements », ni le
// bandeau qui comptait les cours non rattachés — il alertait sur un manque
// qui n'en est plus un. Le rattachement disparaît aussi du formulaire
// (cf. CoursFormModal).
export default function CoursPage() {
  const [cours, setCours] = useState<UniteEnseignement[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<UniteEnseignement | null>(null);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  // Même motivation que pour les salles : « être sûr que ce cours existe »
  // avant d'en créer un doublon (FR-FILT-04).
  const tous = useMemo(() => cours ?? [], [cours]);
  const filtres = useMemo(
    () =>
      tous.filter(
        (ue) => correspond(valeur("q"), ue.intitule) && correspond(valeur("code"), ue.code)
      ),
    [tous, valeur]
  );

  // [2026-09] Retour des gestionnaires : Actualiser ne se débloque qu'une
  // fois l'Intitulé renseigné — Code reste une précision optionnelle.
  const peutActualiser = Boolean(brouillon("q").trim());

  useEffect(() => {
    if (!aActualise) return;
    apiFetch("/cours")
      .then((r) => r.json())
      .then((data) => setCours(data.cours));
  }, [aActualise]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Cours</h1>
          {/* FR-REF-01 : import Excel/CSV à brancher sur l'API une fois disponible */}
          <p className="text-sm text-text-muted">
            Référentiel des unités d&apos;enseignement de votre établissement
            {aActualise && cours ? ` — ${cours.length} cours.` : ""}
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
        placeholder="Intitulé du cours..."
        valeur={brouillon}
        definir={definirBrouillon}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
        manuel
        onActualiser={actualiser}
        peutActualiser={peutActualiser}
        extra={
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Code</span>
            <input
              type="text"
              value={brouillon("code")}
              onChange={(e) => definirBrouillon("code", e.target.value)}
              placeholder="ex : INFO301"
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            />
          </label>
        }
      />

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Renseignez au moins l&apos;intitulé puis cliquez sur Actualiser pour afficher les cours.
        </div>
      ) : (
        <>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[360px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Intitulé</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((ue) => (
              <tr key={ue.id} className="border-t border-border align-top">
                <td className="px-4 py-2 font-medium text-text">{ue.code}</td>
                <td className="px-4 py-2 text-text-muted">{ue.intitule}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setEnEdition(ue)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-xs font-medium text-text hover:bg-surface-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Modifier
                  </button>
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
        </>
      )}

      {modalOuvert || enEdition ? (
        <CoursFormModal
          cours={enEdition}
          onClose={() => {
            setModalOuvert(false);
            setEnEdition(null);
          }}
          onSave={(ue) => {
            setCours((prev) =>
              enEdition ? (prev ?? []).map((c) => (c.id === ue.id ? ue : c)) : [...(prev ?? []), ue]
            );
            setModalOuvert(false);
            setEnEdition(null);
          }}
        />
      ) : null}
    </div>
  );
}
