"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { TypeEtablissement, Ufr } from "@/lib/types";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";

// FR-ADMIN-01/INT-09 : seul l'Admin crée un établissement — ce formulaire
// n'est jamais monté ailleurs que dans /admin/ufrs (RoleGuardShell le
// garantit déjà côté page, l'API le garantit côté serveur).
//
// [V3.2] « Établissement » et non « UFR » : l'UJKZ en compte 12, dont
// 6 instituts et 1 école doctorale. Le type choisi ici détermine
// l'affichage du sigle ("UFR/SH" pour une UFR, "IBAM" pour un institut).
const TYPES: { valeur: TypeEtablissement; label: string; exemple: string }[] = [
  { valeur: "ufr", label: "UFR", exemple: "affiché « UFR/SEA »" },
  { valeur: "institut", label: "Institut", exemple: "affiché « IBAM »" },
  { valeur: "ecole_doctorale", label: "École doctorale", exemple: "affiché « EDICC »" },
];

export function UfrFormModal({ onClose, onSave }: { onClose: () => void; onSave: (ufr: Ufr) => void }) {
  const [nom, setNom] = useState("");
  const [sigle, setSigle] = useState("");
  const [type, setType] = useState<TypeEtablissement>("ufr");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit() {
    if (!nom.trim() || !sigle.trim()) {
      setErreur("Le nom et le sigle sont obligatoires.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    // [V8.6] `try/finally` + `lireReponse` : un serveur injoignable, ou
    // qui répond autre chose que du JSON (500 rendu en HTML), faisait lever
    // avant `setEnCours(false)` — le bouton restait alors bloqué sur son
    // libellé d'attente, indéfiniment et sans message. Même défaut que
    // celui constaté sur l'écran Spécialités le 2026-09-21.
    try {
      const reponse = await apiFetch("/ufrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, sigle, type }),
      });
      const data = await lireReponse<{ erreur?: string; ufr?: Ufr }>(reponse);

      if (!reponse.ok) {
        setErreur(messageErreur(reponse, data, "Impossible de créer l'établissement."));
        return;
      }
      onSave(data.ufr!);
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouvel établissement</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text">Nom de l&apos;établissement</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: UFR Sciences Économiques et de Gestion"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeEtablissement)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.valeur} value={t.valeur}>
                  {t.label} — {t.exemple}
                </option>
              ))}
            </select>
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
              Lettres uniquement, sans le préfixe « UFR/ » : il est ajouté automatiquement à l&apos;affichage selon
              le type. Alimente l&apos;identifiant du compte Gestionnaire (scolarite.&lt;sigle&gt;, en minuscules).
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
              {enCours ? "Création..." : "Créer l'établissement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
