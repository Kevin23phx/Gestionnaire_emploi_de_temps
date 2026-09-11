"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import type { UniteEnseignement } from "@/lib/types";
import { CoursFormModal } from "@/components/cours/CoursFormModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresUrl, valeursDistinctes } from "@/lib/filtres";

export default function CoursPage() {
  const [cours, setCours] = useState<UniteEnseignement[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<UniteEnseignement | null>(null);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

  // Même motivation que pour les salles : « être sûr que ce cours existe »
  // avant d'en créer un doublon (FR-FILT-04).
  const tous = useMemo(() => cours ?? [], [cours]);
  const filtres = useMemo(
    () =>
      tous.filter(
        (ue) =>
          // [V3.3] La recherche porte aussi sur les départements : chercher
          // « Informatique » doit remonter les cours que ce département
          // suit, y compris un tronc commun dont l'intitulé ne le mentionne
          // pas.
          correspond(valeur("q"), ue.intitule, ue.code, ...ue.departements.map((d) => d.libelle)) &&
          (!valeur("niveau") || ue.niveau === valeur("niveau")) &&
          (!valeur("departement") || ue.departements.some((d) => d.libelle === valeur("departement"))) &&
          (valeur("partage") !== "mutualise" || ue.departements.length > 1) &&
          (valeur("partage") !== "sans" || ue.departements.length === 0)
      ),
    [tous, valeur]
  );

  const sansDepartement = tous.filter((ue) => ue.departements.length === 0).length;

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
        placeholder="Rechercher un cours par intitulé, code ou département..."
        filtres={[
          { cle: "niveau", label: "Niveau", options: valeursDistinctes(tous, (ue) => ue.niveau) },
          {
            cle: "departement",
            label: "Département",
            options: [...new Set(tous.flatMap((ue) => ue.departements.map((d) => d.libelle)))].sort((a, b) =>
              a.localeCompare(b, "fr")
            ),
          },
          { cle: "partage", label: "Partage", options: ["mutualise", "sans"] },
        ]}
        valeur={valeur}
        definir={definir}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
      />

      {/* Même logique que l'effectif à zéro sur les groupes : un cours sans
          département n'est pas une erreur, mais il est introuvable par
          département — le dire une fois, en tête. */}
      {cours !== null && sansDepartement > 0 ? (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-status-warning-bg px-3 py-2 text-sm text-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
          <span>
            {sansDepartement} cours sans département. Rattachez-les pour qu&apos;ils apparaissent dans les
            recherches par département.
          </span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Intitulé</th>
              <th className="px-4 py-2 font-medium">Départements</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((ue) => (
              <tr key={ue.id} className="border-t border-border align-top">
                <td className="px-4 py-2 font-medium text-text">{ue.code}</td>
                <td className="px-4 py-2 text-text-muted">
                  {ue.intitule} <span className="text-text-subtle">({ue.niveau})</span>
                </td>
                <td className="px-4 py-2">
                  {ue.departements.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-status-warning">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Non rattaché
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {ue.departements.map((d) => (
                        <span
                          key={d.id}
                          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted"
                        >
                          {d.libelle}
                        </span>
                      ))}
                      {/* Rendre le cas « mutualisé » lisible d'un coup d'œil :
                          c'est l'information que le porteur de projet
                          cherchait en demandant à voir tous les départements
                          qui reçoivent un cours. */}
                      {ue.departements.length > 1 ? (
                        <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                          mutualisé
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
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
