"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { detecterConflits } from "@/lib/conflict-detection";
import type { Creneau, Enseignant, Groupe, Salle, Specialite, UniteEnseignement } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";
import { ConflictPanel } from "@/components/conflicts/ConflictPanel";
import { CreneauFormModal } from "@/components/planning/CreneauFormModal";
import { specialitesDuCouple } from "@/lib/referentiel-options";
import { apiFetch, chargerJson, lireReponse, messageErreur } from "@/lib/api";
import { ajouterJours, depuisIso, libelleSemaine, lundiDe, versIso } from "@/lib/semaines";

type EtatModal = { mode: "creation" } | { mode: "edition"; creneau: Creneau } | null;

// FR-EDT-01 : un créneau appartient à un groupe précis. Ce "programme" est
// la feuille dédiée d'un seul groupe (décision de cadrage 2026-08-17) — la
// grille n'affiche que les créneaux de ce groupe, mais le moteur de
// conflits (FR-CONF-01/02) reste vérifié contre TOUS les créneaux de l'UFR
// pilote : une salle ou un enseignant réservé en double par un AUTRE groupe
// reste un vrai conflit, même si on ne le voit pas sur cette feuille-ci.
export default function ProgrammeGroupePage() {
  const { groupeId } = useParams<{ groupeId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  // [2026-09] Retour des gestionnaires : la flèche « Retour aux programmes »
  // doit rendre l'écran qu'on a quitté, filtres appliqués — pas la page nue
  // d'entrée qu'il faudrait refiltrer à la main. Les filtres de la liste
  // voyagent donc dans l'URL de cette page (cf. planning/page.tsx) et
  // repartent avec le lien de retour.
  const retourQuery = useMemo(() => {
    const requete = searchParams.toString();
    return requete ? `?${requete}` : "";
  }, [searchParams]);
  const lienRetour = `/scolarite/planning${retourQuery}`;

  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [enseignants, setEnseignants] = useState<Enseignant[] | null>(null);
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [unitesEnseignement, setUnitesEnseignement] = useState<UniteEnseignement[] | null>(null);
  // [V8.1] Tout le référentiel des spécialités de l'établissement, en une
  // requête ; le filtrage sur le couple (département, niveau) du groupe se
  // fait ci-dessous. Quelques dizaines d'entrées : un appel ciblé par
  // groupe n'aurait rien économisé et aurait ajouté une dépendance de plus
  // au chargement initial.
  const [specialitesRef, setSpecialitesRef] = useState<Specialite[] | null>(null);
  const [auteur, setAuteur] = useState("Scolarité");
  // Le formulaire de créneau ne s'ouvre QUE sur un clic explicite, ici :
  // « Nouveau créneau » ou une séance de la grille. Qu'on arrive de la carte
  // d'un groupe ou du bouton « Nouveau programme » de la liste, on voit
  // d'abord la même chose — l'emploi du temps du groupe.
  const [modal, setModal] = useState<EtatModal>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [erreurEcriture, setErreurEcriture] = useState<string | null>(null);
  // [V3] FR-EDT-09 : la feuille est rattachée à une semaine calendaire —
  // sans dates à l'écran, une annulation ponctuelle (FR-EDT-07) resterait
  // invisible pour le Gestionnaire qui vient de la saisir.
  const [lundi, setLundi] = useState(() => versIso(lundiDe(new Date())));

  useEffect(() => {
    // [V8.6] `chargerJson` partout : ces sept appels posaient `undefined`
    // dans leur état quand la session avait expiré, et `donneesPretes`
    // n'étant jamais satisfait, l'écran restait bloqué sur « Chargement… »
    // sans rien dire. Le chargeur renvoie désormais l'utilisateur vers la
    // connexion sur un 401 — voir src/lib/api.ts.
    chargerJson<{ creneaux?: Creneau[] }>("/creneaux").then((d) => setCreneaux(d?.creneaux ?? []));
    chargerJson<{ enseignants?: Enseignant[] }>("/enseignants").then((d) =>
      setEnseignants(d?.enseignants ?? [])
    );
    chargerJson<{ salles?: Salle[] }>("/salles").then((d) => setSalles(d?.salles ?? []));
    chargerJson<{ groupes?: Groupe[] }>("/groupes").then((d) => setGroupes(d?.groupes ?? []));
    chargerJson<{ specialites?: Specialite[] }>("/specialites").then((d) =>
      setSpecialitesRef(d?.specialites ?? [])
    );
    chargerJson<{ cours?: UniteEnseignement[] }>("/cours").then((d) =>
      setUnitesEnseignement(d?.cours ?? [])
    );
    chargerJson<{ nom?: string; prenom?: string }>("/auth/me").then((d) => {
      if (d?.nom) setAuteur(`${d.prenom} ${d.nom}`);
    });
  }, []);

  const donneesPretes =
    creneaux !== null &&
    enseignants !== null &&
    salles !== null &&
    groupes !== null &&
    unitesEnseignement !== null;

  const groupeActuel = groupes?.find((g) => g.id === groupeId) ?? null;

  // [V8.1] Spécialités ouvertes au couple (département, niveau) de CE
  // groupe. Vide = tronc commun intégral, l'écran se comporte comme avant
  // la réforme.
  const specialitesDuGroupe = useMemo(() => {
    if (!groupeActuel) return [];
    return specialitesDuCouple(specialitesRef ?? [], groupeActuel.departement, groupeActuel.niveau);
  }, [specialitesRef, groupeActuel]);

  // La spécialité que le Gestionnaire a choisie « au préalable » — dans
  // l'URL et non dans un état local, délibérément : la vue est alors
  // partageable, retrouvable par l'historique du navigateur, et survit à un
  // rechargement en pleine saisie. C'est aussi ce que la modale « Nouveau
  // programme » transmet en ouvrant la feuille.
  const specialiteActive = searchParams.get("specialite") ?? "";

  function changerSpecialite(valeur: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valeur) params.set("specialite", valeur);
    else params.delete("specialite");
    const requete = params.toString();
    router.replace(`/scolarite/planning/${groupeId}${requete ? `?${requete}` : ""}`);
  }

  const semainePrecedente = versIso(ajouterJours(depuisIso(lundi), -7));
  const semaineSuivante = versIso(ajouterJours(depuisIso(lundi), 7));
  const samedi = versIso(ajouterJours(depuisIso(lundi), 5));

  // [V4] Le programme est publié semaine par semaine : la feuille ne montre
  // que la semaine affichée. Sans ce filtre, toutes les semaines saisies se
  // superposeraient dans la même grille de six jours.
  const creneauxDuGroupe = useMemo(
    () => (creneaux ?? []).filter((c) => c.groupe.id === groupeId && c.date >= lundi && c.date <= samedi),
    [creneaux, groupeId, lundi, samedi]
  );

  // [V8.1] Ce qui est AFFICHÉ dans la grille — distinct de `creneauxDuGroupe`
  // ci-dessus, qui reste l'ensemble complet du groupe.
  //
  // La distinction compte : les conflits se calculent toujours sur
  // l'ensemble, jamais sur la vue. Filtrer les deux ferait disparaître de
  // l'écran un double cours dont l'une des deux séances appartient à une
  // spécialité qu'on n'a pas sélectionnée — le Gestionnaire croirait son
  // programme sain.
  //
  // Le filtre reprend la règle du programme étudiant : la spécialité
  // choisie PLUS les cours communs (cf. `filtre_specialite` côté serveur).
  // Le Gestionnaire voit donc exactement ce que verra l'étudiant.
  const creneauxAffiches = useMemo(() => {
    if (!specialiteActive) return creneauxDuGroupe;
    return creneauxDuGroupe.filter(
      (c) => !c.specialite || c.specialite.toLowerCase() === specialiteActive.toLowerCase()
    );
  }, [creneauxDuGroupe, specialiteActive]);

  const conflits = useMemo(() => {
    if (!creneaux) return [];
    const idsDuGroupe = new Set(creneauxDuGroupe.map((c) => c.id));
    return detecterConflits(creneaux).filter((c) =>
      c.creneauxConcernes.some((id) => idsDuGroupe.has(id))
    );
  }, [creneaux, creneauxDuGroupe]);

  function ouvrirEdition(creneauId: string) {
    if (!donneesPretes) return;
    const cible = (creneaux ?? []).find((c) => c.id === creneauId);
    if (cible) setModal({ mode: "edition", creneau: cible });
  }

  // FR-AUD-01 : chaque création, modification ou annulation est historisée
  // (auteur, date, action, motif) — y compris les dérogations à un conflit
  // (FR-CONF-08). Reste hors du updater de setCreneaux, cf. commentaire dans
  // handleSave : React Strict Mode invoque un updater deux fois en dev.
  function journaliser(action: string, motif: string | undefined) {
    apiFetch("/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auteur, action, motif }),
    }).catch(() => {});
  }

  function appliquerResultats(resultats: Creneau[]) {
    setCreneaux((prev) => {
      let suivant = prev ?? [];
      for (const creneau of resultats) {
        const existant = suivant.some((c) => c.id === creneau.id);
        suivant = existant ? suivant.map((c) => (c.id === creneau.id ? creneau : c)) : [...suivant, creneau];
      }
      return suivant;
    });
  }

  // Le backend n'accepte l'écriture qu'en IDs (jamais les objets imbriqués
  // ue/enseignant/groupe/salle que porte Creneau côté lecture) — cf. plan
  // §0 "Créneau write payload" : faire confiance à un objet complet envoyé
  // par le client pour son identité serait une faille. Les créneaux d'aperçu
  // pas encore enregistrés portent un id synthétique "temp-..." (voir
  // CreneauFormModal), à omettre pour que le backend les traite comme une
  // création plutôt qu'une mise à jour d'un id inexistant.
  function versPayloadEcriture(c: Creneau, motifDerogation?: string) {
    return {
      id: c.id.startsWith("temp-") ? undefined : c.id,
      ueId: c.ue.id,
      enseignantId: c.enseignant.id,
      groupeId: c.groupe.id,
      salleId: c.salle.id,
      date: c.date,
      heureDebut: c.heureDebut,
      heureFin: c.heureFin,
      statut: c.statut,
      motif: c.motif,
      // [V8.1] L'affectation. Sans cette ligne, le serveur enregistrerait
      // tous les créneaux comme communs à la promotion — le choix fait à
      // l'écran n'aurait aucun effet, en silence.
      specialite: c.specialite,
      motifDerogation,
    };
  }

  async function handleSave(resultats: Creneau[], motifDerogation: string | null) {
    setErreurEcriture(null);
    const reponse = await apiFetch("/creneaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creneaux: resultats.map((r) => versPayloadEcriture(r, motifDerogation ?? undefined)),
      }),
    });
    // [V8.6] `lireReponse` : un `reponse.json()` direct levait sur une
    // réponse non-JSON, et l'exception partait AVANT tout affichage — le
    // créneau n'était pas enregistré, et rien ne le disait. Le Gestionnaire
    // repartait en croyant son programme à jour.
    const data = await lireReponse<{ erreur?: string; conflits?: { titre: string }[]; creneaux?: Creneau[] }>(
      reponse
    );

    if (!reponse.ok) {
      if (reponse.status === 409 && Array.isArray(data.conflits)) {
        setErreurEcriture(
          `Conflit détecté (${data.conflits.map((c: { titre: string }) => c.titre).join(" · ")}) — ajoutez un motif de dérogation dans le formulaire pour enregistrer malgré tout.`
        );
      } else {
        setErreurEcriture(messageErreur(reponse, data, "Impossible d'enregistrer ce créneau."));
      }
      return; // rien n'a été persisté : ni journal d'audit, ni fermeture du modal.
    }

    // Journalisé seulement après un succès confirmé par le backend — jamais
    // avant, pour ne pas laisser une trace d'audit décrivant une écriture
    // qui a en réalité échoué.
    for (const resultat of resultats) {
      const existant = (creneaux ?? []).some((c) => c.id === resultat.id);
      const type = !existant ? "Création" : resultat.statut === "annule" ? "Annulation" : "Modification";
      journaliser(
        `${type} créneau — ${resultat.ue.intitule} (${resultat.jour} ${resultat.heureDebut}-${resultat.heureFin}) — ${groupeActuel?.nom ?? ""}`,
        resultat.motif ?? motifDerogation ?? undefined
      );
    }

    appliquerResultats(data.creneaux as Creneau[]);

    const pluriel = resultats.length > 1 ? `${resultats.length} créneaux enregistrés` : "Créneau enregistré";
    setConfirmation(
      motifDerogation
        ? `${pluriel} malgré un conflit — dérogation journalisée : "${motifDerogation}".`
        : `${pluriel}.`
    );
    setModal(null);
    setTimeout(() => setConfirmation(null), 5000);
  }

  // Correction groupée depuis le panneau d'alertes (§ConflictPanel) : les
  // séances viennent déjà avec leur nouvelle salle assignée, il ne reste
  // qu'à journaliser et enregistrer en un seul lot — pas de modal à ouvrir.
  // Chaque séance reçoit une salle dont la capacité couvre déjà l'effectif
  // du groupe (filtrage fait dans ConflictPanel), donc pas de nouveau
  // conflit de capacité attendu ici ; un 409 reste possible si la nouvelle
  // salle/horaire chevauche entretemps un autre cours — pas de dérogation
  // automatique dans ce cas, l'utilisateur doit corriger individuellement.
  async function handleCorrectionMasse(creneauxModifies: Creneau[], motif: string) {
    setErreurEcriture(null);
    const reponse = await apiFetch("/creneaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creneaux: creneauxModifies.map((c) => versPayloadEcriture(c)) }),
    });
    // [V8.6] `lireReponse` : un `reponse.json()` direct levait sur une
    // réponse non-JSON, et l'exception partait AVANT tout affichage — le
    // créneau n'était pas enregistré, et rien ne le disait. Le Gestionnaire
    // repartait en croyant son programme à jour.
    const data = await lireReponse<{ erreur?: string; conflits?: { titre: string }[]; creneaux?: Creneau[] }>(
      reponse
    );

    if (!reponse.ok) {
      if (reponse.status === 409 && Array.isArray(data.conflits)) {
        setErreurEcriture(
          `La correction groupée a rencontré un nouveau conflit (${data.conflits.map((c: { titre: string }) => c.titre).join(" · ")}) — corrigez ce créneau individuellement via "Corriger".`
        );
      } else {
        setErreurEcriture(data.erreur ?? "Impossible d'appliquer la correction groupée.");
      }
      return;
    }

    for (const resultat of creneauxModifies) {
      journaliser(
        `Correction groupée créneau — ${resultat.ue.intitule} (${resultat.jour} ${resultat.heureDebut}-${resultat.heureFin}) — ${groupeActuel?.nom ?? ""}`,
        motif
      );
    }

    appliquerResultats(data.creneaux as Creneau[]);

    setConfirmation(
      `${creneauxModifies.length} créneaux corrigés en une seule action — motif : "${motif}".`
    );
    setTimeout(() => setConfirmation(null), 5000);
  }

  if (donneesPretes && !groupeActuel) {
    return (
      <div>
        <Link href={lienRetour} className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux programmes
        </Link>
        <p className="mt-4 text-sm text-text-muted">Ce groupe n&apos;existe pas ou plus.</p>
      </div>
    );
  }

  return (
    <div>
      <Link href={lienRetour} className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour aux programmes
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            Programme — {groupeActuel?.nom ?? "..."}
            {/* [V8.1] La spécialité consultée titre la feuille : sans elle,
                la vue « Informatique » et la vue « Chimie » du même groupe
                porteraient le même titre. */}
            {specialiteActive ? (
              <span className="font-normal text-text-muted"> — {specialiteActive}</span>
            ) : null}
          </h1>
          {groupeActuel ? (
            <p className="text-sm text-text-muted">
              {groupeActuel.departement} · {groupeActuel.niveau} · {groupeActuel.anneeAcademique} ·{" "}
              {groupeActuel.effectif} étudiants
            </p>
          ) : null}
        </div>
        <div className="flex items-end gap-2">
          {/* [V8.1] Le choix « préalable » : il commande à la fois ce que la
              grille montre et l'affectation pré-remplie des créneaux créés
              ensuite. Affiché seulement si le niveau ouvre des spécialités —
              un tronc commun n'a rien à choisir et le champ n'aurait aucun
              sens à l'écran. */}
          {specialitesDuGroupe.length > 0 ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Spécialité</span>
              <select
                value={specialiteActive}
                onChange={(e) => changerSpecialite(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              >
                <option value="">Tout le groupe</option>
                {specialitesDuGroupe.map((sp) => (
                  <option key={sp.id} value={sp.libelle}>
                    {sp.libelle}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            onClick={() => setModal({ mode: "creation" })}
            disabled={!donneesPretes}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nouveau créneau
          </button>
        </div>
      </div>

      {/* Dit ce que la vue courante montre ET ce qu'elle va produire : le
          Gestionnaire doit savoir, avant de cliquer, à qui s'adressera le
          cours qu'il s'apprête à saisir. */}
      {specialiteActive ? (
        <p className="mb-4 rounded-lg bg-brand-light px-3 py-2 text-sm text-brand">
          Vue « {specialiteActive} » : les cours communs à toute la promotion et ceux de cette spécialité.
          Un nouveau créneau lui sera affecté par défaut.
        </p>
      ) : specialitesDuGroupe.length > 0 ? (
        // [V8.1] Le cas symétrique, ajouté le 2026-09-22. Sans ce message,
        // une vue « Tout le groupe » sur un niveau qui a des spécialités
        // était indiscernable d'un programme ordinaire : le Gestionnaire y
        // voyait les cours de toutes les spécialités mêlés sans comprendre
        // pourquoi, et un créneau créé là devenait un cours commun à son
        // insu. Dire ce qu'on regarde vaut mieux que de le laisser déduire.
        <p className="mb-4 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text-muted">
          Vue <strong className="font-medium text-text">toutes spécialités</strong> : ce niveau en propose{" "}
          {specialitesDuGroupe.length}, et les cours de chacune s&apos;affichent ici ensemble. Choisissez-en une
          ci-dessus pour ne voir qu&apos;elle — et pour que vos nouveaux créneaux lui soient affectés. Sans
          choix, un nouveau créneau sera un cours commun à toute la promotion.
        </p>
      ) : null}

      {confirmation ? (
        <p className="mb-4 rounded-lg bg-status-success-bg px-3 py-2 text-sm text-status-success">
          {confirmation}
        </p>
      ) : null}
      {erreurEcriture && !modal ? (
        <p className="mb-4 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
          {erreurEcriture}
        </p>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
        <button
          onClick={() => setLundi(semainePrecedente)}
          aria-label="Semaine précédente"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold text-text">{libelleSemaine(lundi, samedi)}</p>
          <p className="truncate text-xs text-text-subtle">
            {creneauxAffiches.length === 0
              ? "Aucun cours saisi pour cette semaine"
              : `${creneauxAffiches.length} cours programmé${creneauxAffiches.length > 1 ? "s" : ""}`}
            {specialiteActive ? ` — vue « ${specialiteActive} »` : ""}
          </p>
        </div>
        <button
          onClick={() => setLundi(semaineSuivante)}
          aria-label="Semaine suivante"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="order-2 xl:order-1">
          <ScheduleWeekGrid
            creneaux={creneauxAffiches}
            variante="salle-enseignant"
            onCreneauClick={(c) => ouvrirEdition(c.id)}
            lundi={lundi}
          />
        </div>
        <div className="order-1 self-start xl:sticky xl:top-6 xl:order-2">
          <ConflictPanel
            conflits={conflits}
            creneaux={creneaux ?? []}
            salles={salles ?? []}
            onCorriger={ouvrirEdition}
            onCorrigerEnMasse={handleCorrectionMasse}
          />
        </div>
      </div>

      {modal && donneesPretes && groupeActuel ? (
        <CreneauFormModal
          creneau={modal.mode === "edition" ? modal.creneau : null}
          lundi={lundi}
          creneauxExistants={
            modal.mode === "edition"
              ? (creneaux ?? []).filter((c) => c.id !== modal.creneau.id)
              : (creneaux ?? [])
          }
          enseignants={enseignants ?? []}
          groupes={[groupeActuel]}
          specialites={specialitesDuGroupe}
          specialiteParDefaut={specialiteActive}
          salles={salles ?? []}
          unitesEnseignement={unitesEnseignement ?? []}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onEnseignantCree={(e) => setEnseignants((prev) => [...(prev ?? []), e])}
          onUeCree={(ue) => setUnitesEnseignement((prev) => [...(prev ?? []), ue])}
          erreurExterne={erreurEcriture}
        />
      ) : null}
    </div>
  );
}
