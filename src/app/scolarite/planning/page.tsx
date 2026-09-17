"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import type { Creneau, Departement, Groupe } from "@/lib/types";
import { NouveauProgrammeModal } from "@/components/planning/NouveauProgrammeModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresManuel, valeursDistinctes } from "@/lib/filtres";
import { NIVEAUX, anneesAcademiques } from "@/lib/referentiel-options";

// Liste des programmes — un par groupe (décision de cadrage 2026-08-17,
// FR-EDT-01 : un créneau appartient toujours à un groupe précis, on ne
// mélange jamais l'emploi du temps de deux groupes sur une même feuille).
//
// [2026-09] Retour des gestionnaires : cet écran charge en plus TOUS les
// créneaux de toutes les promotions — le plus lourd du référentiel
// gestionnaire. Rien ne charge avant un clic explicite sur "Actualiser".
export default function ListeProgrammesPage() {
  const router = useRouter();
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [departementsRef, setDepartementsRef] = useState<Departement[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  useEffect(() => {
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data) => setDepartementsRef(data.departements));
  }, []);

  useEffect(() => {
    if (!aActualise) return;
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
  }, [router, aActualise]);

  const pretes = aActualise && groupes !== null && creneaux !== null;

  const tous = useMemo(() => groupes ?? [], [groupes]);
  const filtres = useMemo(
    () =>
      tous.filter(
        (g) =>
          correspond(valeur("q"), g.nom, g.departement) &&
          (!valeur("departement") || g.departement === valeur("departement")) &&
          (!valeur("niveau") || g.niveau === valeur("niveau")) &&
          (!valeur("annee") || g.anneeAcademique === valeur("annee"))
      ),
    [tous, valeur]
  );
  // [2026-09] Retour des gestionnaires : Actualiser ne se débloque que si
  // les 3 filtres (Département, Parcours, Année) sont tous renseignés.
  const peutActualiser = Boolean(brouillon("departement") && brouillon("niveau") && brouillon("annee"));

  // [2026-09] Les filtres committés voyagent avec la navigation vers un
  // programme : c'est ce qui permet au lien « Retour aux programmes » de
  // l'écran suivant de ramener ICI, filtres compris, au lieu de renvoyer
  // vers la page nue qu'il faudrait refiltrer entièrement.
  const filtresQuery = useMemo(() => {
    const params = new URLSearchParams();
    for (const cle of ["q", "departement", "niveau", "annee"]) {
      const v = valeur(cle);
      if (v) params.set(cle, v);
    }
    return params.toString();
  }, [valeur]);

  function ouvrirProgramme(groupeId: string, nouveauCreneau = false) {
    const params = new URLSearchParams(filtresQuery);
    if (nouveauCreneau) params.set("nouveau", "1");
    router.push(`/scolarite/planning/${groupeId}?${params.toString()}`);
  }

  // [2026-09] Retour des gestionnaires : une fois le filtre appliqué, le
  // groupe est DÉJÀ désigné — le redemander dans une fenêtre ferait refaire
  // à la main le travail que le filtre vient de faire. On saute donc
  // directement à la saisie du créneau. La fenêtre de choix ne subsiste que
  // pour le cas où le filtre laisse encore plusieurs groupes (un parcours
  // dédoublé en Groupe A / Groupe B) : là, il reste une vraie question à
  // poser, et elle ne porte que sur les groupes retenus par le filtre.
  function nouveauProgramme() {
    if (filtres.length === 1) {
      ouvrirProgramme(filtres[0].id, true);
      return;
    }
    setModalOuvert(true);
  }

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
          onClick={nouveauProgramme}
          disabled={!pretes || filtres.length === 0}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau programme
        </button>
      </div>

      <BarreFiltres
        placeholder="Rechercher un programme par groupe ou département..."
        filtres={[
          {
            cle: "departement",
            label: "Département",
            options: valeursDistinctes(departementsRef ?? [], (d) => d.libelle),
          },
          { cle: "niveau", label: "Parcours", options: [...NIVEAUX] },
          { cle: "annee", label: "Année", options: anneesAcademiques() },
        ]}
        valeur={brouillon}
        definir={definirBrouillon}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
        manuel
        onActualiser={actualiser}
        peutActualiser={peutActualiser}
      />

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Choisissez un Département, un Parcours et une Année, puis cliquez sur Actualiser pour afficher les
          programmes.
        </div>
      ) : !pretes ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
      ) : filtres.length === 0 && tous.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Aucune promotion dans le référentiel pour l&apos;instant — créez-en une depuis la
          section Promotions avant d&apos;ouvrir un programme.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtres.map((groupe) => {
            const nbCreneaux = creneaux.filter((c) => c.groupe.id === groupe.id).length;
            return (
              <button
                key={groupe.id}
                onClick={() => ouvrirProgramme(groupe.id)}
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
          groupes={filtres}
          onClose={() => setModalOuvert(false)}
          onChoisi={(groupeId) => ouvrirProgramme(groupeId, true)}
        />
      ) : null}
    </div>
  );
}
