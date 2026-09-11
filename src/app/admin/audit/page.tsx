"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuditEntry, Ufr } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { useFiltresUrl } from "@/lib/filtres";

// FR-ADMIN-03 : même table que /scolarite/audit, mais transverse à tous les
// établissements — le filtrage par établissement reste appliqué côté API
// selon le rôle authentifié (audit.services.list_entries), jamais
// reconstruit ici.
//
// [V5] Mêmes filtres que /scolarite/audit (FR-AUD-04 : recherche, auteur,
// dates), CÔTÉ SERVEUR pour la même raison — le journal est append-only,
// donc croît sans limite (INV-04), et le plafonner sans pouvoir filtrer
// rendrait l'écran inexploitable au bout d'un semestre. S'y ajoute un
// filtre par **établissement**, qui n'a de sens qu'ici : le Gestionnaire de
// /scolarite/audit ne voit déjà que le sien (INT-07), mais l'Admin, lui,
// supervise les 12 à la fois (FR-ADMIN-03) et a besoin de pouvoir en isoler
// un seul.
export default function JournalAuditAdminPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [etablissements, setEtablissements] = useState<Ufr[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

  const recherche = valeur("q");
  const auteur = valeur("auteur");
  const depuis = valeur("depuis");
  const jusqua = valeur("jusqua");
  const ufrId = valeur("etablissement");

  useEffect(() => {
    apiFetch("/ufrs")
      .then((r) => r.json())
      .then((data) => setEtablissements(data.ufrs))
      .catch(() => setEtablissements([]));
  }, []);

  const requete = useMemo(() => {
    const params = new URLSearchParams();
    if (recherche.trim()) params.set("recherche", recherche.trim());
    if (auteur.trim()) params.set("auteur", auteur.trim());
    if (depuis) params.set("depuis", depuis);
    if (jusqua) params.set("jusqua", jusqua);
    if (ufrId) params.set("ufrId", ufrId);
    const chaine = params.toString();
    return chaine ? `/audit?${chaine}` : "/audit";
  }, [recherche, auteur, depuis, jusqua, ufrId]);

  useEffect(() => {
    let annule = false;
    // Anti-rebond : sans lui, chaque caractère tapé déclencherait une
    // requête au serveur — inutile puisque l'utilisateur tape encore.
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
      <h1 className="mb-6 text-xl font-bold text-text">Journal d&apos;audit — tous les établissements</h1>

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
              <span className="text-xs font-medium text-text-muted">Établissement</span>
              <select
                value={ufrId}
                onChange={(e) => definir("etablissement", e.target.value)}
                disabled={etablissements === null}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
              >
                <option value="">Tous</option>
                {(etablissements ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.sigleAffiche}
                  </option>
                ))}
              </select>
            </label>
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
