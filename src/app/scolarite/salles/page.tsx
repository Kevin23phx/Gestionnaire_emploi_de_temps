"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Salle, StructureGestionnaire, TypeUsageSalle } from "@/lib/types";
import { SalleFormModal } from "@/components/salles/SalleFormModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresUrl, valeursDistinctes } from "@/lib/filtres";

const USAGE_LABEL: Record<TypeUsageSalle, string> = {
  propre: "Propre à l'UFR",
  commune: "Commune",
  louee: "Louée",
  gratuite: "Gratuite",
};

// V2 : "UFR" (propre au Gestionnaire authentifié) ou "DEP" (salle commune/
// louée transversale, gérée par l'Admin — cf. 01_PRD note 2026-08-27).
const GESTIONNAIRE_LABEL: Record<StructureGestionnaire, string> = {
  UFR: "Mon UFR",
  DEP: "DEP (commune/louée)",
};

export default function SallesPage() {
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

  // Le besoin exprimé par le porteur de projet est ici moins « trier une
  // liste » que « vérifier qu'une salle est bien enregistrée » avant de la
  // mettre sur un créneau (FR-FILT-04). La même recherche existe donc aussi
  // dans le sélecteur de salle du formulaire de créneau, où la question se
  // pose réellement.
  const tous = useMemo(() => salles ?? [], [salles]);
  const capaciteMin = Number(valeur("capacite") || 0);
  const filtres = useMemo(
    () =>
      tous.filter(
        (s) =>
          correspond(valeur("q"), s.nom, s.batiment) &&
          (!valeur("batiment") || s.batiment === valeur("batiment")) &&
          (!valeur("usage") || s.typeUsage === valeur("usage")) &&
          (!capaciteMin || s.capacite >= capaciteMin)
      ),
    [tous, valeur, capaciteMin]
  );

  useEffect(() => {
    apiFetch("/salles")
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
            Référentiel des salles de votre établissement
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

      <BarreFiltres
        placeholder="Rechercher une salle ou un bâtiment..."
        filtres={[
          { cle: "batiment", label: "Bâtiment", options: valeursDistinctes(tous, (s) => s.batiment) },
          { cle: "usage", label: "Usage", options: valeursDistinctes(tous, (s) => s.typeUsage) },
        ]}
        valeur={valeur}
        definir={definir}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
        extra={
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Capacité min.</span>
            <input
              type="number"
              min={0}
              step={10}
              value={valeur("capacite")}
              onChange={(e) => definir("capacite", e.target.value)}
              placeholder="ex : 100"
              className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            />
          </label>
        }
      />

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
            {filtres.map((salle) => (
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
        ) : filtres.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-text-muted">
            {tous.length === 0 ? "Aucune salle dans le référentiel." : "Aucune salle ne correspond à ces filtres."}
          </p>
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
