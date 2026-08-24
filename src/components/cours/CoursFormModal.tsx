"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { UniteEnseignement } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// FR-REF-01 : référentiel des unités d'enseignement.
export function CoursFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (ue: UniteEnseignement) => void;
}) {
  const [code, setCode] = useState("");
  const [intitule, setIntitule] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit() {
    setErreur(null);
    setEnCours(true);

    const reponse = await apiFetch("/cours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, intitule }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le cours.");
      return;
    }

    onSave(data.ue);
  }

  const peutEnregistrer = intitule.trim() && !enCours;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouveau cours</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text">Code (optionnel)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex: INFO304"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Intitulé</label>
            <input
              type="text"
              value={intitule}
              onChange={(e) => setIntitule(e.target.value)}
              placeholder="ex: Systèmes d'exploitation"
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
              disabled={!peutEnregistrer}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {enCours ? "Création..." : "Créer le cours"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
