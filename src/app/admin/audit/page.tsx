"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuditEntry, Ufr } from "@/lib/types";
import { AuditTable } from "@/components/audit/AuditTable";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { useFiltresManuel } from "@/lib/filtres";

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
//
// [2026-09] Retour des gestionnaires : rien ne charge avant un clic
// explicite sur "Actualiser" — la liste des établissements (référentiel
// léger) reste chargée d'emblée pour alimenter le filtre.
export default function JournalAuditAdminPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [etablissements, setEtablissements] = useState<Ufr[] | null>(null);
  // Dérivé plutôt qu'un booléen posé dans l'effet : la requête en cours de
  // chargement est celle dont la réponse n'est pas encore arrivée.
  const [requeteChargee, setRequeteChargee] = useState<string | null>(null);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

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
  // [2026-09] Retour des gestionnaires : Actualiser ne se débloque que si
  // les 5 filtres (Recherche, Établissement, Auteur, Du, Au) sont tous
  // renseignés.
  const peutActualiser = Boolean(
    brouillon("q").trim() &&
      brouillon("etablissement") &&
      brouillon("auteur").trim() &&
      brouillon("depuis") &&
      brouillon("jusqua")
  );

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-text">Journal d&apos;audit — tous les établissements</h1>

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
              <span className="text-xs font-medium text-text-muted">Établissement</span>
              <select
                value={brouillon("etablissement")}
                onChange={(e) => definirBrouillon("etablissement", e.target.value)}
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
                value={brouillon("auteur")}
                onChange={(e) => definirBrouillon("auteur", e.target.value)}
                placeholder="Nom du gestionnaire"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
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
          Renseignez Recherche, Établissement, Auteur, Du et Au, puis cliquez sur Actualiser pour afficher le
          journal.
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
