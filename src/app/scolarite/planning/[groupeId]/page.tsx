"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { detecterConflits } from "@/lib/conflict-detection";
import type { Creneau, Enseignant, Groupe, Salle, UniteEnseignement } from "@/lib/types";
import { ScheduleWeekGrid } from "@/components/schedule/ScheduleWeekGrid";
import { ConflictPanel } from "@/components/conflicts/ConflictPanel";
import { CreneauFormModal } from "@/components/planning/CreneauFormModal";

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

  useEffect(() => {
    fetch("/api/creneaux")
      .then((r) => r.json())
      .then((data) => setCreneaux(data.creneaux));
    fetch("/api/enseignants")
      .then((r) => r.json())
      .then((data) => setEnseignants(data.enseignants));
    fetch("/api/salles")
      .then((r) => r.json())
      .then((data) => setSalles(data.salles));
    fetch("/api/groupes")
      .then((r) => r.json())
      .then((data) => setGroupes(data.groupes));
    fetch("/api/cours")
      .then((r) => r.json())
      .then((data) => setUnitesEnseignement(data.cours));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => data.nom && setAuteur(`${data.prenom} ${data.nom}`));
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
    fetch("/api/audit", {
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

  async function handleSave(resultats: Creneau[], motifDerogation: string | null) {
    for (const resultat of resultats) {
      const existant = (creneaux ?? []).some((c) => c.id === resultat.id);
      const type = !existant ? "Création" : resultat.statut === "annule" ? "Annulation" : "Modification";
      journaliser(
        `${type} créneau — ${resultat.ue.intitule} (${resultat.jour} ${resultat.heureDebut}-${resultat.heureFin}) — ${groupeActuel?.nom ?? ""}`,
        resultat.motif ?? motifDerogation ?? undefined
      );
    }

    const reponse = await fetch("/api/creneaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creneaux: resultats }),
    });
    const data = await reponse.json();
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
  async function handleCorrectionMasse(creneauxModifies: Creneau[], motif: string) {
    for (const resultat of creneauxModifies) {
      journaliser(
        `Correction groupée créneau — ${resultat.ue.intitule} (${resultat.jour} ${resultat.heureDebut}-${resultat.heureFin}) — ${groupeActuel?.nom ?? ""}`,
        motif
      );
    }

    const reponse = await fetch("/api/creneaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creneaux: creneauxModifies }),
    });
    const data = await reponse.json();
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

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="order-2 xl:order-1">
          <ScheduleWeekGrid
            creneaux={creneauxDuGroupe}
            variante="salle-enseignant"
            onCreneauClick={(c) => ouvrirEdition(c.id)}
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
        />
      ) : null}
    </div>
  );
}
