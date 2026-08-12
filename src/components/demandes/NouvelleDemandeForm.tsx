"use client";

import { useState, type FormEvent } from "react";
import type { Creneau, TypeDemande } from "@/lib/types";

const TYPES: { value: TypeDemande; label: string }[] = [
  { value: "absence", label: "Signaler une absence" },
  { value: "report", label: "Demander un report" },
  { value: "permutation", label: "Demander une permutation" },
];

// FR-SIG-01 : formulaire de signalement — la demande créée reste "en_attente"
// jusqu'à validation de la Scolarité (FR-SIG-02, RM-04), non appliquée ici.
export function NouvelleDemandeForm({ creneaux }: { creneaux: Creneau[] }) {
  const [type, setType] = useState<TypeDemande>("absence");
  const [creneauId, setCreneauId] = useState(creneaux[0]?.id ?? "");
  const [motif, setMotif] = useState("");
  const [envoyee, setEnvoyee] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Mock : aucune API backend disponible pour l'instant (cf. README).
    setEnvoyee(true);
  }

  if (envoyee) {
    return (
      <p className="rounded-lg bg-status-success-bg px-4 py-3 text-sm text-status-success">
        Votre demande a été envoyée à la scolarité de votre UFR et est en attente de validation.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <label htmlFor="type-demande" className="text-sm font-medium text-text">
          Type de demande
        </label>
        <select
          id="type-demande"
          value={type}
          onChange={(e) => setType(e.target.value as TypeDemande)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="creneau-concerne" className="text-sm font-medium text-text">
          Créneau concerné
        </label>
        <select
          id="creneau-concerne"
          value={creneauId}
          onChange={(e) => setCreneauId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          {creneaux.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ue.intitule} — {c.jour} {c.heureDebut}-{c.heureFin}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="motif" className="text-sm font-medium text-text">
          Motif
        </label>
        <textarea
          id="motif"
          required
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Expliquez la raison de votre demande"
        />
      </div>

      <button
        type="submit"
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Envoyer la demande
      </button>
    </form>
  );
}
