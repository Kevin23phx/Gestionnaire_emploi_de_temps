"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import type { Creneau, Groupe } from "@/lib/types";
import { NouveauProgrammeModal } from "@/components/planning/NouveauProgrammeModal";
import { apiFetch } from "@/lib/api";

// Liste des programmes — un par groupe (décision de cadrage 2026-08-17,
// FR-EDT-01 : un créneau appartient toujours à un groupe précis, on ne
// mélange jamais l'emploi du temps de deux groupes sur une même feuille).
export default function ListeProgrammesPage() {
  const router = useRouter();
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);

  useEffect(() => {
    apiFetch("/groupes")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/connexion");
          return null;
        }
        return r.json();
      })
      .then((data) => data && setGroupes(data.groupes ?? []));
    apiFetch("/creneaux")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/connexion");
          return null;
        }
        return r.json();
      })
      .then((data) => data && setCreneaux(data.creneaux ?? []));
  }, [router]);

  const pretes = groupes !== null && creneaux !== null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Programmes</h1>
          <p className="text-sm text-text-muted">
            Un emploi du temps par groupe — cliquez sur un programme pour le consulter ou le modifier.
          </p>
        </div>
        <button
          onClick={() => setModalOuvert(true)}
          disabled={!pretes}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau programme
        </button>
      </div>

      {!pretes ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
      ) : groupes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Aucun groupe dans le référentiel pour l&apos;instant — créez-en un via
          &laquo;&nbsp;Nouveau programme&nbsp;&raquo; ou depuis la section Groupes.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupes.map((groupe) => {
            const nbCreneaux = creneaux.filter((c) => c.groupe.id === groupe.id).length;
            return (
              <button
                key={groupe.id}
                onClick={() => router.push(`/scolarite/planning/${groupe.id}`)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-brand-light"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-brand" aria-hidden="true" />
                  <span className="font-semibold text-text">{groupe.nom}</span>
                </div>
                <p className="text-xs text-text-muted">
                  {groupe.filiere} · {groupe.niveau} · {groupe.effectif} étudiants
                </p>
                <p className="mt-1 text-xs font-medium text-text-subtle">
                  {nbCreneaux > 0 ? `${nbCreneaux} créneau${nbCreneaux > 1 ? "x" : ""}` : "Programme vide"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {modalOuvert ? (
        <NouveauProgrammeModal
          groupes={groupes ?? []}
          onClose={() => setModalOuvert(false)}
          onChoisi={(groupeId) => router.push(`/scolarite/planning/${groupeId}`)}
        />
      ) : null}
    </div>
  );
}
