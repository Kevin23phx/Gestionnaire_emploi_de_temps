"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { UfrAvecGestionnaire } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// FR-ADMIN-02 : l'identifiant (scolarite.<sigle>) est dérivé côté serveur,
// jamais saisi ici — ce formulaire ne prend que l'identité de la personne.
// Une fois créé, le compte est pré-provisionné et non activé (FR-AUTH-03) :
// l'écran affiche l'identifiant à communiquer au Gestionnaire plutôt que de
// se fermer silencieusement, sans quoi l'Admin n'aurait aucun moyen de le
// retrouver après coup.
export function GestionnaireFormModal({
  ufr,
  onClose,
  onCreated,
}: {
  ufr: UfrAvecGestionnaire;
  onClose: () => void;
  onCreated: (identifiant: string) => void;
}) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [identifiantCree, setIdentifiantCree] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  async function handleSubmit() {
    if (!nom.trim() || !prenom.trim()) {
      setErreur("Le nom et le prénom sont obligatoires.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    const reponse = await apiFetch(`/ufrs/${ufr.id}/gestionnaire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, prenom }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le compte Gestionnaire.");
      return;
    }

    setIdentifiantCree(data.identifiant);
    onCreated(data.identifiant);
  }

  async function copierIdentifiant() {
    if (!identifiantCree) return;
    await navigator.clipboard.writeText(identifiantCree);
    setCopie(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Compte Gestionnaire — {ufr.nom}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {identifiantCree ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              Compte créé, non activé — communiquez cet identifiant au Gestionnaire, il définira lui-même son mot de
              passe à la première connexion.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2">
              <code className="text-sm font-semibold text-text">{identifiantCree}</code>
              <button
                onClick={copierIdentifiant}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-light"
              >
                {copie ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copie ? "Copié" : "Copier"}
              </button>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-text">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
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
                {enCours ? "Création..." : "Créer le compte"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
