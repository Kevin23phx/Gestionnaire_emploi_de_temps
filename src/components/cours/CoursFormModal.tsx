"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { UniteEnseignement } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// [2026-09] Retour des gestionnaires : pas de champ "niveau" séparé — le
// code du cours porte déjà cette information, un champ dédié ferait doublon.
//
// [2026-09] Retour du porteur de projet : un cours n'est plus rattaché à un
// département, ni à la création ni à la modification. La V3.3 avait introduit
// ce rattachement pour rendre lisible le cas « cours mutualisé » ; dans
// l'usage réel, le département qui suit un cours est porté par le GROUPE
// auquel le créneau est rattaché (FR-EDT-01), jamais par le cours lui-même —
// le rattachement faisait donc doublon avec une information déjà vraie
// ailleurs, et pouvait la contredire.
export function CoursFormModal({
  cours,
  onClose,
  onSave,
}: {
  // Renseigné = modification (corriger un intitulé ou un code).
  cours?: UniteEnseignement | null;
  onClose: () => void;
  onSave: (ue: UniteEnseignement) => void;
}) {
  const modeEdition = Boolean(cours);

  const [code, setCode] = useState(cours?.code === "—" ? "" : (cours?.code ?? ""));
  const [intitule, setIntitule] = useState(cours?.intitule ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit() {
    if (!intitule.trim()) {
      setErreur("L'intitulé est obligatoire.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    const corps = { code, intitule };
    const reponse = await apiFetch(modeEdition ? `/cours/${cours!.id}` : "/cours", {
      method: modeEdition ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible d'enregistrer le cours.");
      return;
    }
    onSave(data.ue);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">{modeEdition ? "Modifier le cours" : "Nouveau cours"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="cours-intitule" className="text-sm font-medium text-text">
              Intitulé
            </label>
            <input
              id="cours-intitule"
              type="text"
              value={intitule}
              onChange={(e) => setIntitule(e.target.value)}
              placeholder="ex: Analyse Numérique"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cours-code" className="text-sm font-medium text-text">
              Code (optionnel)
            </label>
            <input
              id="cours-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex: INFO304 (le niveau se lit dans le code)"
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
              {enCours ? "Enregistrement..." : modeEdition ? "Enregistrer" : "Créer le cours"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
