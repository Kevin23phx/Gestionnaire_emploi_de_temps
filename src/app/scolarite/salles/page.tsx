"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Salle, TypeUsageSalle } from "@/lib/types";
import { SalleFormModal } from "@/components/salles/SalleFormModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { chargerJson } from "@/lib/api";
import { correspond, useFiltresManuel } from "@/lib/filtres";

const USAGE_LABEL: Record<TypeUsageSalle, string> = {
  cours: "Cours (CM)",
  td: "Travaux Dirigés (TD)",
  tp: "Travaux Pratiques (TP)",
  laboratoire: "Laboratoire",
};

// [2026-09] Retour des gestionnaires post-présentation : ne rien charger
// avant que le Gestionnaire choisisse ses filtres et clique sur
// "Actualiser" — appliqué à tout le référentiel de la section gestionnaire.
// Les salles ne sont plus rattachées à une UFR (exception ciblée à INT-07,
// cf. 03_Contrat_Invariants_Campus_Manager.md [V7]) : le référentiel est
// unique, partagé par toute l'université.
export default function SallesPage() {
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  const tous = useMemo(() => salles ?? [], [salles]);
  const capaciteMin = Number(valeur("capacite") || 0);
  const filtres = useMemo(
    () =>
      tous.filter(
        (s) =>
          correspond(valeur("q"), s.nom) &&
          (!valeur("usage") || s.typeUsage === valeur("usage")) &&
          (!capaciteMin || s.capacite >= capaciteMin)
      ),
    [tous, valeur, capaciteMin]
  );

  useEffect(() => {
    if (!aActualise) return;
    chargerJson<{ salles?: Salle[] }>("/salles")
      .then((data) => setSalles(data?.salles ?? []));
  }, [aActualise]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Salles</h1>
          {/* FR-REF-01 : import Excel/CSV à brancher sur l'API une fois disponible */}
          <p className="text-sm text-text-muted">
            Référentiel des salles, partagé par toute l&apos;université
            {aActualise && salles ? ` — ${salles.length} salles.` : ""}
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

      <BarreFiltres
        placeholder="Rechercher une salle..."
        filtres={[
          {
            cle: "usage",
            label: "Usage",
            options: ["cours", "td", "tp", "laboratoire"],
          },
        ]}
        valeur={brouillon}
        definir={definirBrouillon}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
        manuel
        onActualiser={actualiser}
        extra={
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Capacité min.</span>
            <input
              type="number"
              min={0}
              step={10}
              value={brouillon("capacite")}
              onChange={(e) => definirBrouillon("capacite", e.target.value)}
              placeholder="ex : 100"
              className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            />
          </label>
        }
      />

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Choisissez vos filtres puis cliquez sur Actualiser pour afficher les salles.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-text-subtle">
                <th className="px-4 py-2 font-medium">Salle</th>
                <th className="px-4 py-2 font-medium">Capacité</th>
                <th className="px-4 py-2 font-medium">Usage</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map((salle) => (
                <tr key={salle.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-text">{salle.nom}</td>
                  <td className="px-4 py-2 text-text-muted">{salle.capacite} pl.</td>
                  <td className="px-4 py-2 text-text-muted">{USAGE_LABEL[salle.typeUsage]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {salles === null ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
          ) : filtres.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              {tous.length === 0 ? "Aucune salle dans le référentiel." : "Aucune salle ne correspond à ces filtres."}
            </p>
          ) : null}
        </div>
      )}

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
