"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Departement } from "@/lib/types";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";
import { useFiltresManuel } from "@/lib/filtres";

// [2026-09] Retour des gestionnaires : les départements évoluent (un
// nouveau département peut apparaître en cours d'année) — cet écran liste
// ceux de l'établissement et permet d'en ajouter un, sans attendre une mise
// à jour du seed (FR-REF-21). Comme le reste du référentiel gestionnaire,
// rien ne charge avant un clic explicite sur "Actualiser".
export default function DepartementsPage() {
  const [departements, setDepartements] = useState<Departement[] | null>(null);
  // Même procédé que le journal d'audit : la requête en cours de chargement
  // est celle dont la réponse n'est pas encore arrivée. Sans ce repère,
  // l'écran afficherait le résultat de la recherche PRÉCÉDENTE pendant que
  // la nouvelle voyage — exactement le clignotement qu'on corrige ici.
  const [requeteChargee, setRequeteChargee] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  // [2026-09] La recherche part AU SERVEUR (`?recherche=`) au lieu d'être
  // appliquée dans le navigateur sur la liste complète. Deux défauts
  // corrigés d'un coup : la requête ne ramène plus tout le référentiel pour
  // n'en afficher qu'une ligne, et l'écran ne peut plus afficher un instant
  // des départements que le filtre écarte — il n'a jamais reçu les autres.
  const recherche = valeur("q").trim();
  const requete = useMemo(
    () => (recherche ? `/departements?recherche=${encodeURIComponent(recherche)}` : "/departements"),
    [recherche]
  );

  const charger = useCallback(() => {
    apiFetch(requete)
      .then((r) => r.json())
      .then((data) => setDepartements(data?.departements ?? []));
  }, [requete]);

  // Dépend de `requete` et pas seulement de `aActualise` : sans ça, changer
  // le terme puis recliquer sur Actualiser ne relançait aucune requête et
  // l'écran gardait le résultat de la recherche précédente.
  useEffect(() => {
    if (!aActualise) return;
    let annule = false;
    apiFetch(requete)
      .then((r) => r.json())
      .then((data) => {
        if (annule) return;
        setDepartements(data.departements);
        setRequeteChargee(requete);
      });
    return () => {
      annule = true;
    };
  }, [aActualise, requete]);

  const filtres = useMemo(() => departements ?? [], [departements]);
  const chargement = aActualise && requete !== requeteChargee;
  // [2026-09] Retour des gestionnaires : Actualiser ne se débloque qu'une
  // fois la recherche renseignée.
  const peutActualiser = Boolean(brouillon("q").trim());

  async function creer() {
    if (!nouveau.trim()) return;
    setErreur(null);
    setEnCours(true);
    // [V8.6] Enveloppé : même défaut que sur l'écran Spécialités, constaté
    // le 2026-09-21 — le bouton restait bloqué sur « Création... ».
    try {
      const reponse = await apiFetch("/departements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: nouveau }),
      });
      const data = await lireReponse<{ erreur?: string }>(reponse);
      if (!reponse.ok) {
        setErreur(messageErreur(reponse, data, "Impossible de créer le département."));
        return;
      }
      setNouveau("");
      if (aActualise) charger();
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Départements</h1>
          <p className="text-sm text-text-muted">
            Référentiel des départements de votre établissement
            {aActualise && departements && !chargement
              ? ` — ${departements.length} résultat${departements.length > 1 ? "s" : ""}.`
              : ""}
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
        total={filtres.length}
        manuel
        onActualiser={actualiser}
        peutActualiser={peutActualiser}
      />

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Renseignez une recherche puis cliquez sur Actualiser pour afficher les départements.
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-xl border border-border bg-surface ${chargement ? "opacity-60" : ""}`}>
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
          {departements === null || chargement ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
          ) : filtres.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              Aucun département ne correspond à « {recherche} ».
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
