"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import type { Creneau, Departement, Groupe, Specialite } from "@/lib/types";
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
  // [V8.1] Le référentiel des spécialités de l'établissement, chargé une
  // fois avec les départements : chaque carte de programme doit pouvoir
  // dire quelles spécialités son niveau propose.
  const [specialitesRef, setSpecialitesRef] = useState<Specialite[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  useEffect(() => {
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data) => setDepartementsRef(data.departements));
    apiFetch("/specialites")
      .then((r) => r.json())
      .then((data) => setSpecialitesRef(data.specialites ?? []))
      .catch(() => setSpecialitesRef([]));
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
  // les 3 filtres (Département, Niveau, Année) sont tous renseignés.
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

  function ouvrirProgramme(groupeId: string, specialite = "") {
    // [V8.1] La spécialité choisie en ouvrant le programme s'ajoute aux
    // filtres de la liste, qui voyagent déjà dans l'URL (cf. plus bas).
    // Elle commande la vue de la feuille et l'affectation par défaut des
    // créneaux qu'on y créera.
    const params = new URLSearchParams(filtresQuery);
    if (specialite) params.set("specialite", specialite);
    const requete = params.toString();
    router.push(`/scolarite/planning/${groupeId}${requete ? `?${requete}` : ""}`);
  }

  // [2026-09] Retour des gestionnaires : une fois le filtre appliqué, le
  // groupe est DÉJÀ désigné — le redemander dans une fenêtre ferait refaire
  // à la main le travail que le filtre vient de faire. La fenêtre de choix
  // ne subsiste que pour le cas où le filtre laisse encore plusieurs groupes
  // (un parcours dédoublé en Groupe A / Groupe B) : là, il reste une vraie
  // question à poser, et elle ne porte que sur les groupes retenus.
  //
  // Les deux chemins arrivent au MÊME écran, la feuille du groupe, d'où l'on
  // clique sur « Nouveau créneau ». Une version intermédiaire ouvrait le
  // formulaire de créneau d'emblée par ce bouton-ci : selon l'endroit cliqué,
  // le même geste donnait deux écrans différents, et on n'avait jamais vu
  // l'emploi du temps auquel on s'apprêtait à ajouter une séance.
  function nouveauProgramme() {
    if (filtres.length === 1) {
      ouvrirProgramme(filtres[0].id);
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
          { cle: "niveau", label: "Niveau", options: [...NIVEAUX] },
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
          Choisissez un Département, un Niveau et une Année, puis cliquez sur Actualiser pour afficher les
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
            const creneauxDuGroupe = creneaux.filter((c) => c.groupe.id === groupe.id);
            const nbCreneaux = creneauxDuGroupe.length;
            // [V8.1] Les spécialités du couple (département, niveau) de ce
            // groupe. Une carte de tronc commun n'en a aucune et garde donc
            // l'apparence d'avant la réforme.
            const specialites = (specialitesRef ?? []).filter(
              (sp) => sp.departement === groupe.departement && sp.niveau === groupe.niveau
            );
            return (
              // [V8.1] Une carte, PLUSIEURS entrées — le programme d'un
              // groupe n'est plus une porte unique.
              //
              // Défaut corrigé le 2026-09-22 : cliquer sur une carte
              // ouvrait toujours la vue « Tout le groupe », sans jamais
              // demander la spécialité. Le Gestionnaire qui avait saisi un
              // programme pour « science du cerveau » le rouvrait avec les
              // cours de toutes les spécialités mêlés, et ne retrouvait pas
              // son travail.
              //
              // Des raccourcis sur la carte plutôt qu'une fenêtre de choix :
              // la fenêtre aurait ajouté un clic à CHAQUE ouverture, y
              // compris pour un tronc commun où il n'y a rien à choisir, et
              // surtout elle n'aurait rien montré. Ici la carte répond à la
              // question avant qu'on la pose — quelles spécialités existent,
              // et combien de cours chacune porte déjà.
              <div
                key={groupe.id}
                className="flex flex-col rounded-xl border border-border bg-surface transition-colors hover:border-brand"
              >
                <button
                  onClick={() => ouvrirProgramme(groupe.id)}
                  className="flex flex-col gap-2 rounded-t-xl p-4 text-left hover:bg-brand-light"
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
                    {specialites.length > 0 ? " · toutes spécialités" : ""}
                  </p>
                </button>

                {specialites.length > 0 ? (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
                      Ouvrir pour une spécialité
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {specialites.map((sp) => {
                        // Les cours AFFECTÉS à cette spécialité, pas ceux
                        // qu'un étudiant y verrait (qui incluraient le tronc
                        // commun) : c'est le repère que cherche le
                        // Gestionnaire — « ce que j'ai saisi ici ».
                        const nb = creneauxDuGroupe.filter(
                          (c) => c.specialite.toLowerCase() === sp.libelle.toLowerCase()
                        ).length;
                        return (
                          <button
                            key={sp.id}
                            onClick={() => ouvrirProgramme(groupe.id, sp.libelle)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-brand hover:bg-brand-light hover:text-brand"
                          >
                            {sp.libelle}
                            {/* Le compteur n'apparaît qu'à partir de 1 : un
                                « 0 » collé à chaque spécialité encore vide
                                ferait lire l'écran comme une liste d'échecs. */}
                            {nb > 0 ? <span className="ml-1 font-semibold">{nb}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
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
          onChoisi={(groupeId, specialite) => ouvrirProgramme(groupeId, specialite)}
        />
      ) : null}
    </div>
  );
}
