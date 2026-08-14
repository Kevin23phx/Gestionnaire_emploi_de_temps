"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type {
  Creneau,
  Enseignant,
  Groupe,
  Salle,
  UniteEnseignement,
} from "@/lib/types";
import { detecterConflits } from "@/lib/conflict-detection";
import { ConflitGraviteBadge } from "@/components/ui/StatusBadge";

const JOURS: { value: Creneau["jour"]; label: string }[] = [
  { value: "lundi", label: "Lundi" },
  { value: "mardi", label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi", label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi", label: "Samedi" },
];

const NOUVEL_ENSEIGNANT = "__nouveau__";
const NOUVELLE_UE = "__nouvelle__";

interface Props {
  creneau: Creneau | null; // null = création, sinon édition
  creneauxExistants: Creneau[]; // ne contient pas `creneau`
  enseignants: Enseignant[];
  groupes: Groupe[];
  salles: Salle[];
  unitesEnseignement: UniteEnseignement[];
  onClose: () => void;
  onSave: (creneau: Creneau, motifDerogation: string | null) => void;
  onEnseignantCree: (enseignant: Enseignant) => void;
}

// FR-EDT-01/02/03 + FR-CONF-01→08 : un seul formulaire pour créer, modifier
// ou annuler un créneau, avec détection de conflits recalculée à chaque
// changement (§4.3 du cahier des charges : "au moment de la saisie ou de la
// modification"), et prise en charge du provisionnement d'un compte
// enseignant à la volée (cf. échange du 2026-08-14 — sans mot de passe,
// l'enseignant l'active lui-même via /activation).
export function CreneauFormModal({
  creneau,
  creneauxExistants,
  enseignants,
  groupes,
  salles,
  unitesEnseignement,
  onClose,
  onSave,
  onEnseignantCree,
}: Props) {
  const modeEdition = creneau !== null;

  const [ueId, setUeId] = useState(creneau?.ue.id ?? unitesEnseignement[0]?.id ?? "");
  const [ueIntituleLibre, setUeIntituleLibre] = useState("");
  const [enseignantId, setEnseignantId] = useState(creneau?.enseignant.id ?? enseignants[0]?.id ?? "");
  const [nouvelEnseignant, setNouvelEnseignant] = useState({ nom: "", prenom: "", identifiant: "" });
  const [groupeId, setGroupeId] = useState(creneau?.groupe.id ?? groupes[0]?.id ?? "");
  const [salleId, setSalleId] = useState(creneau?.salle.id ?? salles[0]?.id ?? "");
  const [jour, setJour] = useState<Creneau["jour"]>(creneau?.jour ?? "lundi");
  const [heureDebut, setHeureDebut] = useState(creneau?.heureDebut ?? "08:00");
  const [heureFin, setHeureFin] = useState(creneau?.heureFin ?? "10:00");
  const [motif, setMotif] = useState("");
  const [motifDerogation, setMotifDerogation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const salleChoisie = salles.find((s) => s.id === salleId);
  const groupeChoisi = groupes.find((g) => g.id === groupeId);

  // Aperçu du créneau tel qu'il serait enregistré, pour calculer les conflits en direct.
  const creneauApercu: Creneau | null = useMemo(() => {
    if (!groupeChoisi || !salleChoisie || heureFin <= heureDebut) return null;
    const ue =
      ueId === NOUVELLE_UE
        ? { id: "ue-temp", code: "", intitule: ueIntituleLibre || "(nouvelle UE)" }
        : unitesEnseignement.find((u) => u.id === ueId);
    const enseignant =
      enseignantId === NOUVEL_ENSEIGNANT
        ? { id: "e-temp", nom: nouvelEnseignant.nom || "?", prenom: nouvelEnseignant.prenom || "?" }
        : enseignants.find((e) => e.id === enseignantId);
    if (!ue || !enseignant) return null;

    return {
      id: creneau?.id ?? "temp-nouveau",
      ue,
      enseignant,
      groupe: groupeChoisi,
      salle: salleChoisie,
      jour,
      heureDebut,
      heureFin,
      statut: creneau?.statut ?? "normal",
    };
  }, [
    creneau,
    groupeChoisi,
    salleChoisie,
    heureDebut,
    heureFin,
    jour,
    ueId,
    ueIntituleLibre,
    unitesEnseignement,
    enseignantId,
    nouvelEnseignant,
    enseignants,
  ]);

  const conflits = useMemo(() => {
    if (!creneauApercu) return [];
    const liste = [...creneauxExistants, creneauApercu];
    return detecterConflits(liste).filter((c) => c.creneauxConcernes.includes(creneauApercu.id));
  }, [creneauApercu, creneauxExistants]);

  const motifRequis = modeEdition; // FR-EDT-02 : motif obligatoire dès qu'on modifie un créneau existant
  const motifManquant = motifRequis && !motif.trim();
  const derogationManquante = conflits.length > 0 && !motifDerogation.trim();
  const nouvelEnseignantIncomplet =
    enseignantId === NOUVEL_ENSEIGNANT &&
    (!nouvelEnseignant.nom.trim() || !nouvelEnseignant.prenom.trim() || !nouvelEnseignant.identifiant.trim());
  const nouvelleUeIncomplete = ueId === NOUVELLE_UE && !ueIntituleLibre.trim();

  const peutEnregistrer =
    creneauApercu !== null &&
    !motifManquant &&
    !derogationManquante &&
    !nouvelEnseignantIncomplet &&
    !nouvelleUeIncomplete &&
    !enCours;

  async function resoudreEnseignant(): Promise<Enseignant | null> {
    if (enseignantId !== NOUVEL_ENSEIGNANT) {
      return enseignants.find((e) => e.id === enseignantId) ?? null;
    }

    const reponse = await fetch("/api/enseignants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelEnseignant),
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le compte enseignant.");
      return null;
    }
    onEnseignantCree(data.enseignant);
    return data.enseignant as Enseignant;
  }

  async function handleEnregistrer() {
    if (!creneauApercu) return;
    setErreur(null);
    setEnCours(true);

    const enseignant = await resoudreEnseignant();
    if (!enseignant) {
      setEnCours(false);
      return;
    }

    const ue: UniteEnseignement =
      ueId === NOUVELLE_UE
        ? { id: `ue-${crypto.randomUUID().slice(0, 8)}`, code: "", intitule: ueIntituleLibre.trim() }
        : (unitesEnseignement.find((u) => u.id === ueId) as UniteEnseignement);

    const resultat: Creneau = {
      ...creneauApercu,
      ue,
      enseignant,
      statut: modeEdition ? "modifie" : "normal",
      motif: modeEdition ? motif.trim() : undefined,
    };

    onSave(resultat, conflits.length > 0 ? motifDerogation.trim() : null);
    setEnCours(false);
  }

  function handleAnnulerCeCours() {
    if (!creneau) return;
    if (!motif.trim()) {
      setErreur("Un motif est obligatoire pour annuler un cours.");
      return;
    }
    onSave({ ...creneau, statut: "annule", motif: motif.trim() }, null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">
            {modeEdition ? "Modifier le créneau" : "Nouveau créneau"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* UE */}
          <div>
            <label className="text-sm font-medium text-text">Unité d&apos;enseignement</label>
            <select
              value={ueId}
              onChange={(e) => setUeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {unitesEnseignement.map((ue) => (
                <option key={ue.id} value={ue.id}>
                  {ue.intitule}
                </option>
              ))}
              <option value={NOUVELLE_UE}>+ Autre (préciser)</option>
            </select>
            {ueId === NOUVELLE_UE ? (
              <input
                type="text"
                placeholder="Intitulé de l'UE"
                value={ueIntituleLibre}
                onChange={(e) => setUeIntituleLibre(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            ) : null}
          </div>

          {/* Enseignant */}
          <div>
            <label className="text-sm font-medium text-text">Enseignant</label>
            <select
              value={enseignantId}
              onChange={(e) => setEnseignantId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {enseignants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </option>
              ))}
              <option value={NOUVEL_ENSEIGNANT}>+ Nouvel enseignant</option>
            </select>
            {enseignantId === NOUVEL_ENSEIGNANT ? (
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3">
                <p className="text-xs text-text-muted">
                  Le compte sera créé sans mot de passe : l&apos;enseignant l&apos;activera
                  lui-même sur l&apos;écran d&apos;activation avec l&apos;identifiant ci-dessous.
                </p>
                <input
                  type="text"
                  placeholder="Nom"
                  value={nouvelEnseignant.nom}
                  onChange={(e) => setNouvelEnseignant((v) => ({ ...v, nom: e.target.value }))}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Prénom"
                  value={nouvelEnseignant.prenom}
                  onChange={(e) => setNouvelEnseignant((v) => ({ ...v, prenom: e.target.value }))}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Identifiant (matricule ou email)"
                  value={nouvelEnseignant.identifiant}
                  onChange={(e) => setNouvelEnseignant((v) => ({ ...v, identifiant: e.target.value }))}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            ) : null}
          </div>

          {/* Groupe */}
          <div>
            <label className="text-sm font-medium text-text">Groupe</label>
            <select
              value={groupeId}
              onChange={(e) => setGroupeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom} ({g.effectif} étudiants)
                </option>
              ))}
            </select>
          </div>

          {/* Salle */}
          <div>
            <label className="text-sm font-medium text-text">Salle</label>
            <select
              value={salleId}
              onChange={(e) => setSalleId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {salles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} — {s.capacite} places
                </option>
              ))}
            </select>
          </div>

          {/* Jour + horaires */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-text">Jour</label>
              <select
                value={jour}
                onChange={(e) => setJour(e.target.value as Creneau["jour"])}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {JOURS.map((j) => (
                  <option key={j.value} value={j.value}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text">Début</label>
              <input
                type="time"
                min="07:00"
                max="18:00"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text">Fin</label>
              <input
                type="time"
                min="07:00"
                max="18:00"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          {heureFin <= heureDebut ? (
            <p className="text-xs text-status-danger">L&apos;heure de fin doit être après l&apos;heure de début.</p>
          ) : null}

          {/* Motif (édition/annulation) */}
          {modeEdition ? (
            <div>
              <label className="text-sm font-medium text-text">Motif de la modification</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Obligatoire pour modifier ou annuler un créneau"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          {/* Conflits en direct */}
          {conflits.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-status-danger/40 bg-status-danger-bg/40 p-3">
              {conflits.map((c) => (
                <div key={c.id}>
                  <ConflitGraviteBadge gravite={c.gravite} />
                  <p className="mt-1 text-sm text-text">{c.titre}</p>
                  <p className="text-xs text-text-muted">{c.description}</p>
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-text">Motif de dérogation</label>
                <input
                  type="text"
                  value={motifDerogation}
                  onChange={(e) => setMotifDerogation(e.target.value)}
                  placeholder="Obligatoire pour enregistrer malgré ce(s) conflit(s)"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          {erreur ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            {modeEdition ? (
              <button
                onClick={handleAnnulerCeCours}
                className="rounded-lg border border-status-danger px-3 py-2 text-sm font-medium text-status-danger hover:bg-status-danger-bg"
              >
                Annuler ce cours
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Fermer
              </button>
              <button
                onClick={handleEnregistrer}
                disabled={!peutEnregistrer}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {enCours ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
