"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { AuditEntry } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { useFiltresManuel } from "@/lib/filtres";

// [V3] FR-AUD-04 — filtrage du journal d'audit, CÔTÉ SERVEUR.
//
// Contrairement aux référentiels (groupes, salles, cours), le journal est
// append-only par construction : INV-04 interdit d'en supprimer une ligne,
// il ne fait donc que croître. Au bout d'un semestre, tout charger pour
// filtrer dans le navigateur rendrait l'écran inutilisable. Le serveur
// plafonne par ailleurs sa réponse (200 entrées), ce qui rend les filtres
// non pas confortables mais nécessaires pour atteindre une entrée ancienne.
//
// [2026-09] Retour des gestionnaires : rien ne charge avant un clic
// explicite sur "Actualiser" — remplace l'ancien anti-rebond automatique
// sur la saisie, devenu inutile puisque la saisie ne déclenche plus rien
// tant que le clic n'a pas eu lieu.
export default function JournalAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  // Dérivé plutôt qu'un booléen posé dans l'effet : la requête en cours de
  // chargement est celle dont la réponse n'est pas encore arrivée.
  const [requeteChargee, setRequeteChargee] = useState<string | null>(null);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  const recherche = valeur("q");
  const depuis = valeur("depuis");
  const jusqua = valeur("jusqua");

  const requete = useMemo(() => {
    const params = new URLSearchParams();
    if (recherche.trim()) params.set("recherche", recherche.trim());
    if (depuis) params.set("depuis", depuis);
    if (jusqua) params.set("jusqua", jusqua);
    const chaine = params.toString();
    return chaine ? `/audit?${chaine}` : "/audit";
  }, [recherche, depuis, jusqua]);

  useEffect(() => {
    if (!aActualise) return;
    let annule = false;
    apiFetch(requete)
      .then((r) => r.json())
      .then((data) => {
        if (annule) return;
        setEntries(data.entries);
        setRequeteChargee(requete);
      })
      .catch(() => {
        if (!annule) setRequeteChargee(requete);
      });

    return () => {
      annule = true;
    };
  }, [requete, aActualise]);

  const chargement = aActualise && requete !== requeteChargee;
  // [2026-09] Retour du porteur de projet : c'est l'INTERVALLE DE DATES, et
  // lui seul, qui débloque Actualiser. L'auteur a disparu des filtres : le
  // journal se consulte par période (« qu'est-il arrivé cette semaine ? »),
  // pas par personne — et exiger un nom qu'on ne connaît pas d'avance
  // empêchait purement et simplement d'ouvrir le journal. La recherche
  // texte reste disponible, en précision facultative.
  const peutActualiser = Boolean(brouillon("depuis") && brouillon("jusqua"));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Journal d&apos;audit</h1>
        {/* FR-AUD-02 : export à brancher sur l'API une fois disponible */}
        <button className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-muted">
          <Download className="h-4 w-4" aria-hidden="true" />
          Exporter
        </button>
      </div>

      <BarreFiltres
        placeholder="Rechercher dans les actions et les motifs..."
        valeur={brouillon}
        definir={definirBrouillon}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={entries?.length ?? 0}
        total={entries?.length ?? 0}
        manuel
        onActualiser={actualiser}
        peutActualiser={peutActualiser}
        extra={
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Du</span>
              <input
                type="date"
                value={brouillon("depuis")}
                onChange={(e) => definirBrouillon("depuis", e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Au</span>
              <input
                type="date"
                value={brouillon("jusqua")}
                onChange={(e) => definirBrouillon("jusqua", e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
          </>
        }
      />

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Choisissez une période (Du et Au), puis cliquez sur Actualiser pour afficher le journal.
        </div>
      ) : (
        <div className={`rounded-xl border border-border bg-surface ${chargement ? "opacity-60" : ""}`}>
          {entries === null ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
          ) : entries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              {actifs > 0 ? "Aucune entrée ne correspond à ces filtres." : "Le journal est vide."}
            </p>
          ) : (
            <AuditTable entries={entries} />
          )}
        </div>
      )}
    </div>
  );
}
