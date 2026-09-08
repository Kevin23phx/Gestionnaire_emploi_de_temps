"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { AuditEntry } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { useFiltresUrl } from "@/lib/filtres";

// [V3] FR-AUD-04 — filtrage du journal d'audit, CÔTÉ SERVEUR.
//
// Contrairement aux référentiels (groupes, salles, cours), le journal est
// append-only par construction : INV-04 interdit d'en supprimer une ligne,
// il ne fait donc que croître. Au bout d'un semestre, tout charger pour
// filtrer dans le navigateur rendrait l'écran inutilisable — et c'est
// exactement la situation que le porteur de projet décrivait en demandant
// des filtres. Le serveur plafonne par ailleurs sa réponse (200 entrées),
// ce qui rend les filtres non pas confortables mais nécessaires pour
// atteindre une entrée ancienne.
export default function JournalAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

  const recherche = valeur("q");
  const auteur = valeur("auteur");
  const depuis = valeur("depuis");
  const jusqua = valeur("jusqua");

  const requete = useMemo(() => {
    const params = new URLSearchParams();
    if (recherche.trim()) params.set("recherche", recherche.trim());
    if (auteur.trim()) params.set("auteur", auteur.trim());
    if (depuis) params.set("depuis", depuis);
    if (jusqua) params.set("jusqua", jusqua);
    const chaine = params.toString();
    return chaine ? `/audit?${chaine}` : "/audit";
  }, [recherche, auteur, depuis, jusqua]);

  useEffect(() => {
    let annule = false;
    // Anti-rebond : sans lui, chaque caractère tapé déclencherait une
    // requête au serveur — coûteux sur les connexions visées par le cahier
    // des charges (§1.4), et inutile puisque l'utilisateur tape encore.
    const minuterie = setTimeout(() => {
      apiFetch(requete)
        .then((r) => r.json())
        .then((data) => {
          if (annule) return;
          setEntries(data.entries);
          setChargement(false);
        })
        .catch(() => {
          if (!annule) setChargement(false);
        });
    }, 250);

    return () => {
      annule = true;
      clearTimeout(minuterie);
    };
  }, [requete]);

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
        valeur={valeur}
        definir={definir}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={entries?.length ?? 0}
        total={entries?.length ?? 0}
        extra={
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Auteur</span>
              <input
                type="text"
                value={valeur("auteur")}
                onChange={(e) => definir("auteur", e.target.value)}
                placeholder="Nom du gestionnaire"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Du</span>
              <input
                type="date"
                value={valeur("depuis")}
                onChange={(e) => definir("depuis", e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Au</span>
              <input
                type="date"
                value={valeur("jusqua")}
                onChange={(e) => definir("jusqua", e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
          </>
        }
      />

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
    </div>
  );
}
