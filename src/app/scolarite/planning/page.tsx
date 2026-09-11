"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import type { Creneau, Groupe } from "@/lib/types";
import { NouveauProgrammeModal } from "@/components/planning/NouveauProgrammeModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresUrl, valeursDistinctes } from "@/lib/filtres";

// Liste des programmes — un par groupe (décision de cadrage 2026-08-17,
// FR-EDT-01 : un créneau appartient toujours à un groupe précis, on ne
// mélange jamais l'emploi du temps de deux groupes sur une même feuille).
export default function ListeProgrammesPage() {
  const router = useRouter();
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

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

  const tous = useMemo(() => groupes ?? [], [groupes]);
  const filtres = useMemo(
    () =>
      tous.filter(
        (g) =>
          correspond(valeur("q"), g.nom, g.departement) &&
          (!valeur("departement") || g.departement === valeur("departement")) &&
          (!valeur("niveau") || g.niveau === valeur("niveau")) &&
          (!valeur("annee") || g.anneeAcademique === valeur("annee")) &&
          // Un programme encore vide est ce qu'un Gestionnaire cherche en
          // priorité en début de semestre : « lesquels me reste-t-il à
          // saisir ? ». Sans ce filtre, il faut ouvrir les cartes une à une.
          (valeur("etat") !== "vide" || !(creneaux ?? []).some((c) => c.groupe.id === g.id)) &&
          (valeur("etat") !== "rempli" || (creneaux ?? []).some((c) => c.groupe.id === g.id))
      ),
    [tous, creneaux, valeur]
  );

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

      {pretes ? (
        <BarreFiltres
          placeholder="Rechercher un programme par groupe ou département..."
          filtres={[
            { cle: "departement", label: "Département", options: valeursDistinctes(tous, (g) => g.departement) },
            { cle: "niveau", label: "Niveau", options: valeursDistinctes(tous, (g) => g.niveau) },
            { cle: "annee", label: "Année", options: valeursDistinctes(tous, (g) => g.anneeAcademique) },
            { cle: "etat", label: "État", options: ["rempli", "vide"] },
          ]}
          valeur={valeur}
          definir={definir}
          reinitialiser={reinitialiser}
          actifs={actifs}
          resultats={filtres.length}
          total={tous.length}
        />
      ) : null}

      {!pretes ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
      ) : filtres.length === 0 && tous.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Aucun groupe dans le référentiel pour l&apos;instant — créez-en un depuis la
          section Groupes avant d&apos;ouvrir un programme.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtres.map((groupe) => {
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
                  {/* [V3.3] L'année académique fait partie de l'identité d'un
                      groupe : « L3 INFO - Groupe A » existe en 2025-2026 ET en
                      2026-2027, ce sont deux programmes différents. Sans elle
                      à l'écran, rien ne distingue la promotion courante de la
                      précédente. */}
                  {groupe.departement} · {groupe.niveau} · {groupe.anneeAcademique} · {groupe.effectif} étudiants
                </p>
                <p className="mt-1 text-xs font-medium text-text-subtle">
                  {nbCreneaux > 0 ? `${nbCreneaux} créneau${nbCreneaux > 1 ? "x" : ""}` : "Programme vide"}
                </p>
              </button>
            );
          })}
          {filtres.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
              Aucun programme ne correspond à ces filtres.
            </p>
          ) : null}
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
