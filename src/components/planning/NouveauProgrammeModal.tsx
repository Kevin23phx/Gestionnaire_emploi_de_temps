"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Groupe } from "@/lib/types";
import { apiFetch } from "@/lib/api";

const NOUVEAU_GROUPE = "__nouveau__";

// "Nouveau programme" = choisir le groupe pour lequel on ouvre une feuille
// (chaque programme est dédié à un seul groupe, cf. décision de cadrage
// 2026-08-17) — soit un groupe déjà référencé, soit un tout nouveau créé à
// la volée via /api/groupes (même schéma que le raccourci "+ Nouvel
// enseignant" du formulaire de créneau).
export function NouveauProgrammeModal({
  groupes,
  onClose,
  onChoisi,
}: {
  groupes: Groupe[];
  onClose: () => void;
  onChoisi: (groupeId: string) => void;
}) {
  const [groupeId, setGroupeId] = useState(groupes[0]?.id ?? NOUVEAU_GROUPE);
  // Pas de champ "effectif" ici : un groupe naît toujours à 0, jamais saisi
  // à la main (cf. Groupe.effectif dans types.ts — toujours dérivé des
  // étudiants réellement rattachés, comme GroupeFormModal). L'API rejette
  // d'ailleurs explicitement tout champ inconnu dans le payload.
  const [nouveauGroupe, setNouveauGroupe] = useState({ nom: "", filiere: "", niveau: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleValider() {
    if (groupeId !== NOUVEAU_GROUPE) {
      onChoisi(groupeId);
      return;
    }

    setErreur(null);
    setEnCours(true);
    const reponse = await apiFetch("/groupes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauGroupe),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le groupe.");
      return;
    }
    onChoisi(data.groupe.id);
  }

  const nouveauGroupeIncomplet =
    groupeId === NOUVEAU_GROUPE &&
    (!nouveauGroupe.nom.trim() || !nouveauGroupe.filiere.trim() || !nouveauGroupe.niveau.trim());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouveau programme</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text">Pour quel groupe ?</label>
            <select
              value={groupeId}
              onChange={(e) => setGroupeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom}
                </option>
              ))}
              <option value={NOUVEAU_GROUPE}>+ Nouveau groupe</option>
            </select>
          </div>

          {groupeId === NOUVEAU_GROUPE ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3">
              <input
                type="text"
                placeholder="Nom du groupe (ex: L3 INFO - Groupe B)"
                value={nouveauGroupe.nom}
                onChange={(e) => setNouveauGroupe((v) => ({ ...v, nom: e.target.value }))}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Filière"
                value={nouveauGroupe.filiere}
                onChange={(e) => setNouveauGroupe((v) => ({ ...v, filiere: e.target.value }))}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Niveau (ex: L1, L2, L3, M1, M2)"
                value={nouveauGroupe.niveau}
                onChange={(e) => setNouveauGroupe((v) => ({ ...v, niveau: e.target.value }))}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          {erreur ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              Annuler
            </button>
            <button
              onClick={handleValider}
              disabled={nouveauGroupeIncomplet || enCours || (groupes.length === 0 && groupeId !== NOUVEAU_GROUPE)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {enCours ? "Création..." : "Ouvrir le programme"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
