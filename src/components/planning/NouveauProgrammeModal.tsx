"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import type { Groupe } from "@/lib/types";

// "Nouveau programme" = choisir le groupe pour lequel on ouvre une feuille
// (chaque programme est dédié à un seul groupe, cf. décision de cadrage
// 2026-08-17).
//
// [V5] Retiré : la création d'un groupe à la volée depuis cet écran. Elle
// dupliquait — en pire — ce que GroupeFormModal fait déjà bien : pas de
// listes déroulantes (département/niveau saisis en texte libre, source
// exacte des doublons que les listes déroulantes de GroupeFormModal
// existent pour éviter), pas de champ effectif, donc un groupe silencieusement
// créé à 0 étudiant qui n'aurait jamais déclenché ERR-10. Un seul chemin de
// création de groupe, cohérent, vaut mieux que deux chemins qui divergent.
export function NouveauProgrammeModal({
  groupes,
  onClose,
  onChoisi,
}: {
  groupes: Groupe[];
  onClose: () => void;
  onChoisi: (groupeId: string) => void;
}) {
  const [groupeId, setGroupeId] = useState(groupes[0]?.id ?? "");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouveau programme</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {groupes.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              Aucune promotion n&apos;est encore enregistrée dans votre établissement. Créez-en une dans la
              section Promotions avant d&apos;ouvrir un programme.
            </p>
            <Link
              href="/scolarite/groupes"
              onClick={onClose}
              className="rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover"
            >
              Aller à la section Promotions
            </Link>
          </div>
        ) : (
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
              </select>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Annuler
              </button>
              <button
                onClick={() => onChoisi(groupeId)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Ouvrir le programme
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
