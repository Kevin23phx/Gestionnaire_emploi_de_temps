"use client";

import { useState } from "react";
import { CalendarX2, RotateCcw } from "lucide-react";
import type { Creneau } from "@/lib/types";
import { JOURS_SEMAINE, datesDeLaSemaine, libelleDateCourte } from "@/lib/semaines";

// [V3] FR-EDT-07 — annuler UNE séance à une date précise.
//
// Panneau distinct du formulaire de créneau, et c'est délibéré : ce
// formulaire porte sur le créneau récurrent (« le cours du lundi 8h de tout
// le semestre »), alors qu'ici on agit sur une occurrence (« la séance du
// lundi 15 »). Ce sont deux objets de nature différente (RM-10) ; les
// réunir dans le même écran garantirait qu'un Gestionnaire pressé annule un
// semestre entier en croyant traiter une absence d'un jour.
//
// C'est devenu le geste le plus fréquent de la V3 : l'enseignant téléphone,
// le Gestionnaire annule la séance concernée, et l'agenda des étudiants
// abonnés se met à jour tout seul.

export function SeancesSemaine({
  creneaux,
  lundi,
  onAnnuler,
  onRetablir,
}: {
  creneaux: Creneau[];
  lundi: string;
  onAnnuler: (creneauId: string, date: string, motif: string) => Promise<void>;
  onRetablir: (creneauId: string, date: string) => Promise<void>;
}) {
  const [cible, setCible] = useState<{ creneau: Creneau; date: string } | null>(null);
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);

  const dates = datesDeLaSemaine(lundi);
  const seances = JOURS_SEMAINE.flatMap((jour, i) =>
    creneaux
      .filter((c) => c.jour === jour)
      .sort((a, b) => (a.heureDebut < b.heureDebut ? -1 : 1))
      .map((creneau) => ({
        creneau,
        date: dates[i],
        annulation: creneau.seancesAnnulees.find((sa) => sa.date === dates[i]),
      }))
  );

  async function confirmer() {
    if (!cible || !motif.trim()) return;
    setEnCours(true);
    await onAnnuler(cible.creneau.id, cible.date, motif.trim());
    setEnCours(false);
    setCible(null);
    setMotif("");
  }

  if (seances.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text">Séances de cette semaine</h2>
        <p className="text-xs text-text-muted">
          Un enseignant signale une absence ? Annulez la séance concernée : le cours reprend normalement les autres
          semaines.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {seances.map(({ creneau, date, annulation }) => (
          <li key={`${creneau.id}-${date}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            <span className="w-24 shrink-0 text-xs font-medium text-text-subtle">
              {creneau.jour} {libelleDateCourte(date)}
            </span>
            <span className="w-24 shrink-0 text-xs text-text-muted">
              {creneau.heureDebut}–{creneau.heureFin}
            </span>
            <span className={`min-w-0 flex-1 truncate ${annulation ? "text-text-muted line-through" : "text-text"}`}>
              {creneau.ue.intitule}
            </span>

            {annulation ? (
              <>
                <span
                  className="truncate text-xs italic text-status-danger"
                  title={`Annulée — ${annulation.motif}`}
                >
                  Annulée — {annulation.motif}
                </span>
                <button
                  onClick={() => onRetablir(creneau.id, date)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-text hover:bg-surface-muted"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Rétablir
                </button>
              </>
            ) : creneau.statut === "annule" ? (
              // Le créneau entier est annulé : proposer d'annuler une de ses
              // séances n'aurait aucun sens (ERR-09).
              <span className="shrink-0 text-xs italic text-text-subtle">Cours annulé pour toute la période</span>
            ) : (
              <button
                onClick={() => {
                  setCible({ creneau, date });
                  setMotif("");
                }}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-text hover:bg-surface-muted"
              >
                <CalendarX2 className="h-3.5 w-3.5" aria-hidden="true" />
                Annuler cette séance
              </button>
            )}
          </li>
        ))}
      </ul>

      {cible ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-bold text-text">Annuler une séance</h3>
            <p className="mt-1 text-sm text-text-muted">
              {cible.creneau.ue.intitule} — {cible.creneau.jour} {libelleDateCourte(cible.date)},{" "}
              {cible.creneau.heureDebut}–{cible.creneau.heureFin}
            </p>
            <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-text-muted">
              Cette séance uniquement. Le cours aura bien lieu les autres semaines.
            </p>

            <label className="mt-4 block text-sm font-medium text-text">
              Motif
              {/* INT-03 : jamais d'annulation muette — le motif part dans le
                  programme public et dans l'agenda des étudiants abonnés. */}
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="ex : absence de l'enseignant (mission)"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <p className="mt-1 text-xs text-text-subtle">
              Ce motif sera visible par les étudiants sur le programme public et dans leur agenda.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setCible(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Renoncer
              </button>
              <button
                onClick={confirmer}
                disabled={!motif.trim() || enCours}
                className="rounded-lg bg-status-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
              >
                {enCours ? "Annulation..." : "Annuler la séance"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
