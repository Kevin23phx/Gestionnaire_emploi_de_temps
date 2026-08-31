"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Ufr } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// FR-ADMIN-01/INT-09 : seul l'Admin crée une UFR — ce formulaire n'est
// jamais monté ailleurs que dans /admin/ufrs (RoleGuardShell le garantit
// déjà côté page, l'API le garantit côté serveur).
export function UfrFormModal({ onClose, onSave }: { onClose: () => void; onSave: (ufr: Ufr) => void }) {
  const [nom, setNom] = useState("");
  const [sigle, setSigle] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit() {
    if (!nom.trim() || !sigle.trim()) {
      setErreur("Le nom et le sigle sont obligatoires.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    const reponse = await apiFetch("/ufrs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, sigle }),
    });
    const data = await reponse.json();
    setEnCours(false);

    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer l'UFR.");
      return;
    }

    onSave(data.ufr);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouvelle UFR</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text">Nom de l&apos;UFR</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: UFR Sciences Économiques et de Gestion"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Sigle</label>
            <input
              type="text"
              value={sigle}
              onChange={(e) => setSigle(e.target.value)}
              placeholder="ex: SEG"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-subtle">
              Alimente l&apos;identifiant du compte Gestionnaire (scolarite.&lt;sigle&gt;, en minuscules).
            </p>
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
              {enCours ? "Création..." : "Créer l'UFR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
