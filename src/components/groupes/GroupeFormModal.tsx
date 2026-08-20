"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Groupe } from "@/lib/types";

// FR-REF-01 : référentiel des groupes/filières. Pas de champ "Effectif" ici
// — un groupe naît vide (0 étudiant) et se peuple ensuite via
// GroupeEtudiantsModal (import ou affectation), jamais par une estimation
// tapée à la création (retour utilisateur du 2026-08-18 : ce nombre doit
// refléter les étudiants réellement rattachés, cf. Groupe.effectif dans
// types.ts).
export function GroupeFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (groupe: Groupe) => void;
}) {
  const [nom, setNom] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit() {
    if (!nom.trim() || !filiere.trim() || !niveau.trim()) {
      setErreur("Le nom, la filière et le niveau sont obligatoires.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    const reponse = await fetch("/api/groupes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, filiere, niveau }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le groupe.");
      return;
    }

    onSave(data.groupe);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouveau groupe</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text">Nom du groupe</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: L3 INFO - Groupe B"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Filière</label>
            <input
              type="text"
              value={filiere}
              onChange={(e) => setFiliere(e.target.value)}
              placeholder="ex: Informatique"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Niveau</label>
            <input
              type="text"
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              placeholder="ex: L1, L2, L3, M1, M2"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

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
              onClick={handleSubmit}
              disabled={enCours}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {enCours ? "Création..." : "Créer le groupe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
