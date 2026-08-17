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
  { value: "lundi", label: "Lun" },
  { value: "mardi", label: "Mar" },
  { value: "mercredi", label: "Mer" },
  { value: "jeudi", label: "Jeu" },
  { value: "vendredi", label: "Ven" },
  { value: "samedi", label: "Sam" },
];

const HEURE_MIN = 7;
const HEURE_MAX = 18;
const OPTIONS_HEURE = Array.from(
  { length: HEURE_MAX - HEURE_MIN + 1 },
  (_, i) => `${String(HEURE_MIN + i).padStart(2, "0")}:00`
);

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
  onSave: (creneaux: Creneau[], motifDerogation: string | null) => void;
  onEnseignantCree: (enseignant: Enseignant) => void;
  onUeCree: (ue: UniteEnseignement) => void;
}

// FR-EDT-01/02/03 + FR-CONF-01→08 : un seul formulaire pour créer, modifier
// ou annuler un/des créneau(x), avec détection de conflits recalculée à
// chaque changement (§4.3 : "au moment de la saisie ou de la modification").
// En création, un cours peut se répéter sur plusieurs jours de la semaine
// (ex. lundi ET jeudi) : un créneau distinct est généré par jour coché, tous
// identiques hormis le jour. En édition, on modifie une seule occurrence à
// la fois — changer le jour déplace ce créneau précis, ça n'en crée pas
// d'autres.
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
  onUeCree,
}: Props) {
  const modeEdition = creneau !== null;

  const [ueId, setUeId] = useState(creneau?.ue.id ?? unitesEnseignement[0]?.id ?? "");
  const [ueIntituleLibre, setUeIntituleLibre] = useState("");
  const [enseignantId, setEnseignantId] = useState(creneau?.enseignant.id ?? enseignants[0]?.id ?? "");
  const [nouvelEnseignant, setNouvelEnseignant] = useState({ nom: "", prenom: "", identifiant: "" });
  const [groupeId, setGroupeId] = useState(creneau?.groupe.id ?? groupes[0]?.id ?? "");
  const [salleId, setSalleId] = useState(creneau?.salle.id ?? salles[0]?.id ?? "");
  const [jours, setJours] = useState<Set<Creneau["jour"]>>(new Set([creneau?.jour ?? "lundi"]));
  const [heureDebut, setHeureDebut] = useState(creneau?.heureDebut ?? "08:00");
  const [heureFin, setHeureFin] = useState(creneau?.heureFin ?? "10:00");
  const [motif, setMotif] = useState("");
  const [motifDerogation, setMotifDerogation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const groupeChoisi = groupes.find((g) => g.id === groupeId);
  const salleChoisie = salles.find((s) => s.id === salleId);
  const optionsHeureFin = OPTIONS_HEURE.filter((h) => h > heureDebut);

  // Rien n'empêche techniquement un créneau de durer 10h (RM-01 ne borne pas
  // la durée), mais dans la pratique un séminaire de 4h est déjà long — une
  // saisie plus longue est presque toujours une erreur d'horaire plutôt
  // qu'un vrai cours. Avertissement non bloquant, pas une interdiction.
  const dureeHeures =
    heureFin > heureDebut
      ? Number(heureFin.slice(0, 2)) - Number(heureDebut.slice(0, 2))
      : 0;
  const dureeInhabituelle = dureeHeures > 4;

  function toggleJour(jour: Creneau["jour"]) {
    if (!modeEdition) {
      setJours((prev) => {
        const suivant = new Set(prev);
        if (suivant.has(jour)) suivant.delete(jour);
        else suivant.add(jour);
        return suivant;
      });
    } else {
      setJours(new Set([jour])); // édition : un seul jour à la fois
    }
  }

  // Aperçu des créneaux tels qu'ils seraient enregistrés (un par jour coché), pour le calcul de conflits en direct.
  const creneauxApercu: Creneau[] = useMemo(() => {
    if (!groupeChoisi || !salleChoisie || jours.size === 0) return [];
    const ue =
      ueId === NOUVELLE_UE
        ? { id: "ue-temp", code: "", intitule: ueIntituleLibre || "(nouvelle UE)" }
        : unitesEnseignement.find((u) => u.id === ueId);
    const enseignant =
      enseignantId === NOUVEL_ENSEIGNANT
        ? { id: "e-temp", nom: nouvelEnseignant.nom || "?", prenom: nouvelEnseignant.prenom || "?" }
        : enseignants.find((e) => e.id === enseignantId);
    if (!ue || !enseignant) return [];

    return Array.from(jours).map((jour, i) => ({
      id: modeEdition ? (creneau?.id ?? `temp-${i}`) : `temp-nouveau-${i}`,
      ue,
      enseignant,
      groupe: groupeChoisi,
      salle: salleChoisie,
      jour,
      heureDebut,
      heureFin,
      statut: creneau?.statut ?? "normal",
    }));
  }, [
    creneau,
    modeEdition,
    groupeChoisi,
    salleChoisie,
    jours,
    heureDebut,
    heureFin,
    ueId,
    ueIntituleLibre,
    unitesEnseignement,
    enseignantId,
    nouvelEnseignant,
    enseignants,
  ]);

  const conflits = useMemo(() => {
    if (creneauxApercu.length === 0) return [];
    // Les créneaux d'aperçu sont toujours sur des jours distincts (un par
    // case cochée) : ils ne peuvent jamais entrer en conflit entre eux, donc
    // pas de risque de doublon ici — chaque paire n'est évaluée qu'une fois.
    const idsApercu = new Set(creneauxApercu.map((c) => c.id));
    const liste = [...creneauxExistants, ...creneauxApercu];
    return detecterConflits(liste).filter((c) => c.creneauxConcernes.some((id) => idsApercu.has(id)));
  }, [creneauxApercu, creneauxExistants]);

  const motifRequis = modeEdition; // FR-EDT-02 : motif obligatoire dès qu'on modifie un créneau existant
  const motifManquant = motifRequis && !motif.trim();
  const derogationManquante = conflits.length > 0 && !motifDerogation.trim();
  const nouvelEnseignantIncomplet =
    enseignantId === NOUVEL_ENSEIGNANT &&
    (!nouvelEnseignant.nom.trim() || !nouvelEnseignant.prenom.trim() || !nouvelEnseignant.identifiant.trim());
  const nouvelleUeIncomplete = ueId === NOUVELLE_UE && !ueIntituleLibre.trim();

  const peutEnregistrer =
    creneauxApercu.length > 0 &&
    heureFin > heureDebut &&
    !motifManquant &&
    !derogationManquante &&
    !nouvelEnseignantIncomplet &&
    !nouvelleUeIncomplete &&
    !enCours;

  async function resoudreUe(): Promise<UniteEnseignement | null> {
    if (ueId !== NOUVELLE_UE) {
      return unitesEnseignement.find((u) => u.id === ueId) ?? null;
    }

    const reponse = await fetch("/api/cours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intitule: ueIntituleLibre }),
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de créer le cours.");
      return null;
    }
    onUeCree(data.ue);
    return data.ue as UniteEnseignement;
  }

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
    if (creneauxApercu.length === 0) return;
    setErreur(null);
    setEnCours(true);

    const ue = await resoudreUe();
    if (!ue) {
      setEnCours(false);
      return;
    }

    const enseignant = await resoudreEnseignant();
    if (!enseignant) {
      setEnCours(false);
      return;
    }

    const resultats: Creneau[] = creneauxApercu.map((apercu) => ({
      ...apercu,
      ue,
      enseignant,
      statut: modeEdition ? "modifie" : "normal",
      motif: modeEdition ? motif.trim() : undefined,
    }));

    onSave(resultats, conflits.length > 0 ? motifDerogation.trim() : null);
    setEnCours(false);
  }

  function handleAnnulerCeCours() {
    if (!creneau) return;
    if (!motif.trim()) {
      setErreur("Un motif est obligatoire pour annuler un cours.");
      return;
    }
    onSave([{ ...creneau, statut: "annule", motif: motif.trim() }], null);
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

          {/* Jours */}
          <div>
            <label className="text-sm font-medium text-text">
              {modeEdition ? "Jour" : "Jour(s) — un cours peut se répéter plusieurs fois par semaine"}
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {JOURS.map((j) => {
                const actif = jours.has(j.value);
                return (
                  <button
                    key={j.value}
                    type="button"
                    onClick={() => toggleJour(j.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      actif
                        ? "border-brand bg-brand text-white"
                        : "border-border text-text-muted hover:bg-surface-muted"
                    }`}
                  >
                    {j.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text">Début</label>
              <select
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {OPTIONS_HEURE.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text">Fin</label>
              <select
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {optionsHeureFin.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {dureeInhabituelle ? (
            <p className="-mt-2 rounded-lg bg-status-warning-bg px-3 py-2 text-xs text-status-warning">
              Ce créneau dure {dureeHeures}h — vérifiez qu&apos;il ne s&apos;agit pas d&apos;une erreur de
              saisie (la plupart des cours durent 1 à 3h). Un cours qui revient plusieurs fois par
              semaine se règle avec les jours cochés ci-dessus, pas avec une plage horaire plus longue.
            </p>
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
