"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Salle, TypeUsageSalle } from "@/lib/types";
import { apiFetch } from "@/lib/api";

const TYPES: { value: TypeUsageSalle; label: string }[] = [
  { value: "cours", label: "Cours (CM)" },
  { value: "td", label: "Travaux Dirigés (TD)" },
  { value: "tp", label: "Travaux Pratiques (TP)" },
  { value: "laboratoire", label: "Laboratoire" },
];

// FR-REF-02 : capacité et type d'usage sont obligatoires — nécessaires au
// référentiel des salles (§4.1). Pas de champ "bâtiment" : retour des
// gestionnaires, ce n'est pas une information nécessaire à la saisie.
export function SalleFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (salle: Salle) => void;
}) {
  const [nom, setNom] = useState("");
  const [capacite, setCapacite] = useState("");
  const [typeUsage, setTypeUsage] = useState<TypeUsageSalle>("cours");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit() {
    setErreur(null);
    setEnCours(true);

    const reponse = await apiFetch("/salles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, capacite, typeUsage }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer la salle.");
      return;
    }

    onSave(data.salle);
  }

  const peutEnregistrer = nom.trim() && Number(capacite) > 0 && !enCours;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouvelle salle</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text">Nom de la salle</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: Amphi B, Salle 205"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Capacité d&apos;accueil</label>
            <input
              type="number"
              min={1}
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              placeholder="ex: 60"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Type d&apos;usage</label>
            <select
              value={typeUsage}
              onChange={(e) => setTypeUsage(e.target.value as TypeUsageSalle)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
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
              {enCours ? "Création..." : "Créer la salle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
