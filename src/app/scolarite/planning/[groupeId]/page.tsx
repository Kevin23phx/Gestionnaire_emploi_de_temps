"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { detecterConflits } from "@/lib/conflict-detection";
import type { Creneau, Enseignant, Groupe, Salle, UniteEnseignement, Ufr } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";
import { ConflictPanel } from "@/components/conflicts/ConflictPanel";
import { CreneauFormModal } from "@/components/planning/CreneauFormModal";
import { SeancesSemaine } from "@/components/planning/SeancesSemaine";
import { apiFetch } from "@/lib/api";
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

  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [enseignants, setEnseignants] = useState<Enseignant[] | null>(null);
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [unitesEnseignement, setUnitesEnseignement] = useState<UniteEnseignement[] | null>(null);
  const [auteur, setAuteur] = useState("Scolarité");
  const [modal, setModal] = useState<EtatModal>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [erreurEcriture, setErreurEcriture] = useState<string | null>(null);
  // [V3] FR-EDT-09 : la feuille est rattachée à une semaine calendaire —
  // sans dates à l'écran, une annulation ponctuelle (FR-EDT-07) resterait
  // invisible pour le Gestionnaire qui vient de la saisir.
  const [lundi, setLundi] = useState(() => versIso(lundiDe(new Date())));
  const [ufr, setUfr] = useState<Ufr | null>(null);

  useEffect(() => {
    apiFetch("/creneaux")
      .then((r) => r.json())
      .then((data) => setCreneaux(data.creneaux));
    apiFetch("/enseignants")
      .then((r) => r.json())
      .then((data) => setEnseignants(data.enseignants));
    apiFetch("/salles")
      .then((r) => r.json())
      .then((data) => setSalles(data.salles));
    apiFetch("/groupes")
      .then((r) => r.json())
      .then((data) => setGroupes(data.groupes));
    apiFetch("/cours")
      .then((r) => r.json())
      .then((data) => setUnitesEnseignement(data.cours));
    apiFetch("/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.nom) setAuteur(`${data.prenom} ${data.nom}`);
        if (!data.ufrId) return;
        // FR-REF-16 : la période académique borne la navigation par semaine.
        const reponse = await apiFetch("/ufrs");
        const { ufrs } = await reponse.json();
        setUfr((ufrs as Ufr[]).find((u) => u.id === data.ufrId) ?? null);
      });
  }, []);

  const donneesPretes =
    creneaux !== null &&
    enseignants !== null &&
    salles !== null &&
    groupes !== null &&
    unitesEnseignement !== null;

  const groupeActuel = groupes?.find((g) => g.id === groupeId) ?? null;

  const creneauxDuGroupe = useMemo(
    () => (creneaux ?? []).filter((c) => c.groupe.id === groupeId),
    [creneaux, groupeId]
  );

  const conflits = useMemo(() => {
    if (!creneaux) return [];
    const idsDuGroupe = new Set(creneauxDuGroupe.map((c) => c.id));
    return detecterConflits(creneaux).filter((c) =>
      c.creneauxConcernes.some((id) => idsDuGroupe.has(id))
    );
  }, [creneaux, creneauxDuGroupe]);

  const semainePrecedente = versIso(ajouterJours(depuisIso(lundi), -7));
  const semaineSuivante = versIso(ajouterJours(depuisIso(lundi), 7));
  const samedi = versIso(ajouterJours(depuisIso(lundi), 5));
  const peutReculer = !ufr?.periodeDebut || versIso(ajouterJours(depuisIso(semainePrecedente), 5)) >= ufr.periodeDebut;
  const peutAvancer = !ufr?.periodeFin || semaineSuivante <= ufr.periodeFin;

  // [V3] FR-EDT-07 — annulation/rétablissement d'une séance datée. Le
  // backend renvoie le créneau complet remis à jour (avec sa nouvelle
  // révision et sa liste d'annulations) : on remplace l'état local avec sa
  // réponse plutôt que de le recalculer ici, pour que l'écran ne puisse
  // jamais raconter autre chose que la base.
  async function annulerSeance(creneauId: string, date: string, motif: string) {
    setErreurEcriture(null);
    const reponse = await apiFetch(`/creneaux/${creneauId}/seance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, motif }),
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      setErreurEcriture(data.erreur ?? "Impossible d'annuler cette séance.");
      return;
    }
    appliquerResultats([data as Creneau]);
    setConfirmation(`Séance du ${date} annulée. Les étudiants abonnés en sont informés.`);
    setTimeout(() => setConfirmation(null), 5000);
  }

  async function retablirSeance(creneauId: string, date: string) {
    setErreurEcriture(null);
    const reponse = await apiFetch(`/creneaux/${creneauId}/seance?date=${encodeURIComponent(date)}`, {
      method: "DELETE",
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      setErreurEcriture(data.erreur ?? "Impossible de rétablir cette séance.");
      return;
    }
    appliquerResultats([data as Creneau]);
    setConfirmation(`Séance du ${date} rétablie.`);
    setTimeout(() => setConfirmation(null), 5000);
  }

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
      jour: c.jour,
      heureDebut: c.heureDebut,
      heureFin: c.heureFin,
      statut: c.statut,
      motif: c.motif,
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
    const data = await reponse.json();

    if (!reponse.ok) {
      if (reponse.status === 409 && Array.isArray(data.conflits)) {
        setErreurEcriture(
          `Conflit détecté (${data.conflits.map((c: { titre: string }) => c.titre).join(" · ")}) — ajoutez un motif de dérogation dans le formulaire pour enregistrer malgré tout.`
        );
      } else {
        setErreurEcriture(data.erreur ?? "Impossible d'enregistrer ce créneau.");
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
    const data = await reponse.json();

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
        <Link href="/scolarite/planning" className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux programmes
        </Link>
        <p className="mt-4 text-sm text-text-muted">Ce groupe n&apos;existe pas ou plus.</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/scolarite/planning" className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour aux programmes
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            Programme — {groupeActuel?.nom ?? "..."}
          </h1>
          {groupeActuel ? (
            <p className="text-sm text-text-muted">
              {groupeActuel.filiere} · {groupeActuel.niveau} · {groupeActuel.effectif} étudiants
            </p>
          ) : null}
        </div>
        <button
          onClick={() => setModal({ mode: "creation" })}
          disabled={!donneesPretes}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau créneau
        </button>
      </div>

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
          disabled={!peutReculer}
          aria-label="Semaine précédente"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold text-text">{libelleSemaine(lundi, samedi)}</p>
          {ufr?.periodeDebut ? (
            <p className="truncate text-xs text-text-subtle">
              {ufr.periodeLibelle ?? "Période académique"} : {ufr.periodeDebut} → {ufr.periodeFin}
            </p>
          ) : (
            // Sans période déclarée, la navigation n'a pas de bornes et le
            // flux calendrier n'a pas de fin de récurrence (FR-REF-16).
            <p className="truncate text-xs text-status-warning">
              Période académique non définie — à renseigner dans le tableau de bord.
            </p>
          )}
        </div>
        <button
          onClick={() => setLundi(semaineSuivante)}
          disabled={!peutAvancer}
          aria-label="Semaine suivante"
          className="rounded-lg border border-border p-2 text-text-muted hover:bg-surface-muted disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="order-2 flex flex-col gap-6 xl:order-1">
          <ScheduleWeekGrid
            creneaux={creneauxDuGroupe}
            variante="salle-enseignant"
            onCreneauClick={(c) => ouvrirEdition(c.id)}
            lundi={lundi}
          />
          <SeancesSemaine
            creneaux={creneauxDuGroupe}
            lundi={lundi}
            onAnnuler={annulerSeance}
            onRetablir={retablirSeance}
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
          creneauxExistants={
            modal.mode === "edition"
              ? (creneaux ?? []).filter((c) => c.id !== modal.creneau.id)
              : (creneaux ?? [])
          }
          enseignants={enseignants ?? []}
          groupes={[groupeActuel]}
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
