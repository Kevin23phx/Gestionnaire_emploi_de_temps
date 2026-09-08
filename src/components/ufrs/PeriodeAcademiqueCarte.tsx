"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Ufr } from "@/lib/types";

// [V3] FR-REF-16/17 — la période académique de l'UFR du Gestionnaire.
//
// Deux choses en dépendent, et aucune n'est cosmétique : la borne de fin de
// récurrence du flux calendrier (sans elle, un cours se répète indéfiniment
// dans l'agenda des étudiants abonnés) et la validation des dates
// d'annulation de séance (INT-11). D'où l'alerte visible tant qu'elle n'est
// pas renseignée, plutôt qu'un réglage discret enfoui dans un menu.
export function PeriodeAcademiqueCarte() {
  const [ufr, setUfr] = useState<Ufr | null>(null);
  const [edition, setEdition] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    apiFetch("/auth/me")
      .then((r) => r.json())
      .then(async (moi) => {
        if (!moi.ufrId || annule) return;
        const { ufrs } = await (await apiFetch("/ufrs")).json();
        if (annule) return;
        const trouve = (ufrs as Ufr[]).find((u) => u.id === moi.ufrId) ?? null;
        setUfr(trouve);
        setLibelle(trouve?.periodeLibelle ?? "");
        setDebut(trouve?.periodeDebut ?? "");
        setFin(trouve?.periodeFin ?? "");
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  async function enregistrer() {
    setErreur(null);
    setEnCours(true);
    const reponse = await apiFetch("/ufrs/periode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle, debut, fin }),
    });
    const data = await reponse.json();
    setEnCours(false);
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible d'enregistrer la période.");
      return;
    }
    setUfr(data.ufr);
    setEdition(false);
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 4000);
  }

  if (!ufr) return null;

  const definie = Boolean(ufr.periodeDebut && ufr.periodeFin);

  return (
    <div
      className={`rounded-xl border bg-surface p-4 ${
        definie ? "border-border" : "border-status-warning/40 bg-status-warning-bg"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            Période académique
          </p>
          {definie ? (
            <p className="mt-1 text-sm text-text">
              <span className="font-semibold">{ufr.periodeLibelle ?? "Période en cours"}</span> — du{" "}
              {ufr.periodeDebut} au {ufr.periodeFin}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text">
              Non définie. Tant qu&apos;elle ne l&apos;est pas, les emplois du temps publiés dans l&apos;agenda des
              étudiants se répètent sans date de fin, et une séance ne peut pas être annulée hors période.
            </p>
          )}
        </div>
        {!edition ? (
          <button
            onClick={() => setEdition(true)}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-muted"
          >
            {definie ? "Modifier" : "Définir"}
          </button>
        ) : null}
        {enregistre ? (
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-status-success">
            <Check className="h-4 w-4" aria-hidden="true" />
            Enregistrée
          </span>
        ) : null}
      </div>

      {edition ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Libellé</span>
              <input
                type="text"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                placeholder="ex : Semestre 1 2025-2026"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Début</span>
              <input
                type="date"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Fin</span>
              <input
                type="date"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>

          {erreur ? <p className="text-sm text-status-danger">{erreur}</p> : null}

          <p className="text-xs text-text-subtle">
            Ne concerne que votre établissement : chacun déclare son propre calendrier.
          </p>

          <div className="flex gap-2">
            <button
              onClick={enregistrer}
              disabled={!debut || !fin || enCours}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={() => setEdition(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              Renoncer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
