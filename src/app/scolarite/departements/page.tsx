"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Departement } from "@/lib/types";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresManuel } from "@/lib/filtres";

// [2026-09] Retour des gestionnaires : les départements évoluent (un
// nouveau département peut apparaître en cours d'année) — cet écran liste
// ceux de l'établissement et permet d'en ajouter un, sans attendre une mise
// à jour du seed (FR-REF-21). Comme le reste du référentiel gestionnaire,
// rien ne charge avant un clic explicite sur "Actualiser".
export default function DepartementsPage() {
  const [departements, setDepartements] = useState<Departement[] | null>(null);
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  function charger() {
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data) => setDepartements(data.departements));
  }

  useEffect(() => {
    if (!aActualise) return;
    charger();
  }, [aActualise]);

  const tous = useMemo(() => departements ?? [], [departements]);
  const filtres = useMemo(() => tous.filter((d) => correspond(valeur("q"), d.libelle)), [tous, valeur]);
  // [2026-09] Retour des gestionnaires : Actualiser ne se débloque qu'une
  // fois la recherche renseignée.
  const peutActualiser = Boolean(brouillon("q").trim());

  async function creer() {
    if (!nouveau.trim()) return;
    setErreur(null);
    setEnCours(true);
    const reponse = await apiFetch("/departements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: nouveau }),
    });
    const data = await reponse.json();
    setEnCours(false);
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le département.");
      return;
    }
    setNouveau("");
    if (aActualise) charger();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Départements</h1>
          <p className="text-sm text-text-muted">
            Référentiel des départements de votre établissement
            {aActualise && departements ? ` — ${departements.length} départements.` : ""}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-text-muted">Nouveau département</span>
          <input
            type="text"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            placeholder="ex : Informatique"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
        </label>
        <button
          onClick={creer}
          disabled={enCours || !nouveau.trim()}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {enCours ? "Création..." : "Ajouter"}
        </button>
      </div>
      {erreur ? (
        <p className="mb-4 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
      ) : null}

      <BarreFiltres
        placeholder="Rechercher un département..."
        valeur={brouillon}
        definir={definirBrouillon}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
        manuel
        onActualiser={actualiser}
        peutActualiser={peutActualiser}
      />

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Renseignez une recherche puis cliquez sur Actualiser pour afficher les départements.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-text-subtle">
                <th className="px-4 py-2 font-medium">Libellé</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-text">{d.libelle}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {departements === null ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
          ) : filtres.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              {tous.length === 0 ? "Aucun département dans le référentiel." : "Aucun département ne correspond à ces filtres."}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
