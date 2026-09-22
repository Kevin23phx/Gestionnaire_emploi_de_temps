"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Groupe, Specialite } from "@/lib/types";
import { apiFetch } from "@/lib/api";

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
  onChoisi: (groupeId: string, specialite: string) => void;
}) {
  const [groupeId, setGroupeId] = useState(groupes[0]?.id ?? "");
  const [specialite, setSpecialite] = useState("");
  const [specialitesRef, setSpecialitesRef] = useState<Specialite[] | null>(null);

  useEffect(() => {
    let annule = false;
    apiFetch("/specialites")
      .then((r) => r.json())
      .then((data: { specialites?: Specialite[] }) => {
        if (!annule) setSpecialitesRef(data.specialites ?? []);
      })
      .catch(() => {
        if (!annule) setSpecialitesRef([]);
      });
    return () => {
      annule = true;
    };
  }, []);

  const groupeChoisi = groupes.find((g) => g.id === groupeId) ?? null;

  // Les spécialités du couple (département, niveau) du groupe choisi.
  // Dérivées, jamais posées dans un effet : changer de groupe doit changer
  // la liste dans le même rendu, sans l'instant où l'écran propose encore
  // les spécialités du groupe précédent.
  const specialitesDuGroupe = useMemo(() => {
    if (!groupeChoisi) return [];
    return (specialitesRef ?? []).filter(
      (sp) => sp.departement === groupeChoisi.departement && sp.niveau === groupeChoisi.niveau
    );
  }, [specialitesRef, groupeChoisi]);

  // Le choix ne survit pas à un changement de groupe : « Chimie » n'a
  // aucune raison d'exister dans un autre département. Filtré à la lecture
  // plutôt que remis à zéro par un effet — cf. GroupeFormModal.
  const specialiteRetenue = specialitesDuGroupe.some((sp) => sp.libelle === specialite)
    ? specialite
    : "";

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

            {/* [V8.1] Inerte quand le niveau du groupe n'ouvre aucune
                spécialité : il n'y a alors qu'une seule vue possible. */}
            <div>
              <label htmlFor="programme-specialite" className="text-sm font-medium text-text">
                Pour quelle spécialité ?
              </label>
              <select
                id="programme-specialite"
                value={specialiteRetenue}
                onChange={(e) => setSpecialite(e.target.value)}
                disabled={specialitesRef === null || specialitesDuGroupe.length === 0}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">
                  {specialitesRef === null
                    ? "Chargement..."
                    : specialitesDuGroupe.length === 0
                      ? "Tout le groupe (aucune spécialité à ce niveau)"
                      : "Tout le groupe (toutes spécialités)"}
                </option>
                {specialitesDuGroupe.map((sp) => (
                  <option key={sp.id} value={sp.libelle}>
                    {sp.libelle}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-subtle">
                {specialiteRetenue
                  ? `Vous verrez les cours communs et ceux de « ${specialiteRetenue} », et chaque nouveau créneau lui sera affecté par défaut.`
                  : "Vous verrez tout le programme du groupe, toutes spécialités confondues. Modifiable à tout moment depuis la feuille."}
              </p>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Annuler
              </button>
              <button
                onClick={() => onChoisi(groupeId, specialiteRetenue)}
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
