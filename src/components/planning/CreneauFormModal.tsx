"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type {
  Creneau,
  Enseignant,
  Groupe,
  Salle,
  UniteEnseignement,
} from "@/lib/types";
import { detecterConflits } from "@/lib/conflict-detection";
import { decouperSelonPauses } from "@/lib/pauses";
import { normaliser } from "@/lib/recherche";
import { correspond } from "@/lib/filtres";
import { ConflitGraviteBadge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { ajouterJours, depuisIso, versIso } from "@/lib/semaines";

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
  // Lundi (ISO) de la semaine en cours d'édition — les jours cochés y sont
  // rapportés pour produire des dates réelles.
  lundi: string;
  creneauxExistants: Creneau[]; // ne contient pas `creneau`
  enseignants: Enseignant[];
  groupes: Groupe[];
  salles: Salle[];
  unitesEnseignement: UniteEnseignement[];
  onClose: () => void;
  onSave: (creneaux: Creneau[], motifDerogation: string | null) => void;
  onEnseignantCree: (enseignant: Enseignant) => void;
  onUeCree: (ue: UniteEnseignement) => void;
  // Erreur renvoyée par le backend après un onSave() qui a échoué (ex. 409 —
  // conflit détecté côté serveur alors que l'aperçu client ne le voyait pas
  // encore) : affichée au même endroit que les erreurs de validation locales,
  // le formulaire reste ouvert pour corriger/compléter le motif de dérogation.
  erreurExterne?: string | null;
}

// FR-EDT-01/02/03 + FR-CONF-01→08 : un seul formulaire pour créer, modifier
// ou annuler un/des créneau(x), avec détection de conflits recalculée à
// chaque changement (§4.3 : "au moment de la saisie ou de la modification").
// [V4] Les jours cochés sont résolus en DATES de la semaine affichée : le
// programme est publié semaine par semaine, « lundi » veut donc dire « le
// lundi de cette semaine-là », jamais « tous les lundis ».
//
// En création, un cours peut se répéter sur plusieurs jours de la semaine
// (ex. lundi ET jeudi) : un créneau distinct est généré par jour coché, tous
// identiques hormis le jour. En édition, on modifie une seule occurrence à
// la fois — changer le jour déplace ce créneau précis, ça n'en crée pas
// d'autres.
export function CreneauFormModal({
  creneau,
  lundi,
  creneauxExistants,
  enseignants,
  groupes,
  salles,
  unitesEnseignement,
  onClose,
  onSave,
  onEnseignantCree,
  onUeCree,
  erreurExterne,
}: Props) {
  const modeEdition = creneau !== null;

  const [ueId, setUeId] = useState(creneau?.ue.id ?? unitesEnseignement[0]?.id ?? "");
  const [ueIntituleLibre, setUeIntituleLibre] = useState("");
  const [ueRecherche, setUeRecherche] = useState("");
  const [enseignantId, setEnseignantId] = useState(creneau?.enseignant.id ?? enseignants[0]?.id ?? "");
  // [V3] Plus d'identifiant : créer un enseignant crée une FICHE de
  // référentiel, plus un compte de connexion (FR-REF-04 révisée).
  const [nouvelEnseignant, setNouvelEnseignant] = useState({ nom: "", prenom: "" });
  // [V3] FR-FILT-04 : « être sûr que la salle/l'enseignant est bien
  // enregistré » — c'est ICI que la question se pose vraiment, au moment de
  // construire le créneau, pas dans l'écran de référentiel qu'il faudrait
  // aller ouvrir dans un autre onglet.
  const [salleRecherche, setSalleRecherche] = useState("");
  const [enseignantRecherche, setEnseignantRecherche] = useState("");
  const [salleId, setSalleId] = useState(creneau?.salle.id ?? salles[0]?.id ?? "");
  const [jours, setJours] = useState<Set<Creneau["jour"]>>(new Set([creneau?.jour ?? "lundi"]));

  // Un jour de la semaine affichée → sa date réelle. Mémorisé sur `lundi` :
  // recréée à chaque rendu, la fonction relancerait le calcul d'aperçu et de
  // conflits en boucle.
  const dateDuJour = useCallback(
    (j: Creneau["jour"]) =>
      versIso(ajouterJours(depuisIso(lundi), JOURS.findIndex((x) => x.value === j))),
    [lundi]
  );
  const [heureDebut, setHeureDebut] = useState(creneau?.heureDebut ?? "08:00");
  const [heureFin, setHeureFin] = useState(creneau?.heureFin ?? "10:00");
  const [motif, setMotif] = useState("");
  const [motifDerogation, setMotifDerogation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Le groupe n'est jamais un choix de l'utilisateur dans ce formulaire : un
  // "programme" est la feuille d'UN SEUL groupe (décision de cadrage
  // 2026-08-17), donc en création c'est celui de la page courante
  // (`groupes[0]`), et en édition c'est celui déjà porté par le créneau —
  // qui peut différer de `groupes[0]` quand on corrige depuis une alerte de
  // conflit inter-groupes (ex. double réservation de salle entre deux
  // programmes différents). Chercher ce groupe dans la liste verrouillée de
  // la page courante échouait dans ce cas (retour utilisateur du
  // 2026-08-18) : on prend directement l'objet, jamais une recherche par id.
  const groupeChoisi = creneau?.groupe ?? groupes[0];
  const salleChoisie = salles.find((s) => s.id === salleId);
  const optionsHeureFin = OPTIONS_HEURE.filter((h) => h > heureDebut);
  const ueSelectionnee = ueId !== NOUVELLE_UE ? unitesEnseignement.find((u) => u.id === ueId) : undefined;
  const enseignantSelectionne =
    enseignantId !== NOUVEL_ENSEIGNANT ? enseignants.find((e) => e.id === enseignantId) : undefined;

  // Même traitement que pour les cours : une UFR compte des dizaines de
  // salles et d'enseignants, et un `<select>` brut oblige à les faire défiler
  // à l'aveugle.
  const sallesFiltrees = useMemo(
    () => salles.filter((s) => correspond(salleRecherche, s.nom)),
    [salles, salleRecherche]
  );
  const enseignantsFiltres = useMemo(
    () => enseignants.filter((e) => correspond(enseignantRecherche, e.nom, e.prenom)),
    [enseignants, enseignantRecherche]
  );

  // Un UFR compte des centaines de cours : filtrer par code ou intitulé
  // plutôt que défiler une longue liste (retour utilisateur du 2026-08-18).
  const uesFiltrees = useMemo(() => {
    const requete = normaliser(ueRecherche.trim());
    if (!requete) return unitesEnseignement;
    return unitesEnseignement.filter(
      (u) => normaliser(u.intitule).includes(requete) || normaliser(u.code).includes(requete)
    );
  }, [unitesEnseignement, ueRecherche]);

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

  // Aperçu des créneaux tels qu'ils seraient enregistrés, pour le calcul de
  // conflits en direct. Une plage saisie (ex. 08:00-18:00) est d'abord
  // découpée en séances qui évitent les pauses fixes (decouperSelonPauses),
  // puis multipliée par jour coché : "Lundi à Jeudi, 8h-18h" donne donc 4
  // jours × N séances par jour, jamais un seul bloc qui engloberait une
  // pause.
  const creneauxApercu: Creneau[] = useMemo(() => {
    if (!groupeChoisi || !salleChoisie || jours.size === 0) return [];
    const ue =
      ueId === NOUVELLE_UE
        ? {
            id: "ue-temp",
            code: "",
            intitule: ueIntituleLibre || "(nouvelle UE)",
            niveau: "",
            ufrId: "",
            // Aperçu local d'une UE pas encore créée : elle n'a pas encore
            // de départements, et le calcul de conflits n'en a pas besoin.
            departements: [],
          }
        : unitesEnseignement.find((u) => u.id === ueId);
    const enseignant =
      enseignantId === NOUVEL_ENSEIGNANT
        ? { id: "e-temp", nom: nouvelEnseignant.nom || "?", prenom: nouvelEnseignant.prenom || "?" }
        : enseignants.find((e) => e.id === enseignantId);
    if (!ue || !enseignant) return [];

    const segments = decouperSelonPauses(heureDebut, heureFin);
    const resultats: Creneau[] = [];
    let i = 0;
    for (const jour of jours) {
      for (const segment of segments) {
        const premierSegment = modeEdition && i === 0;
        resultats.push({
          id: premierSegment ? (creneau?.id ?? "temp-0") : `temp-nouveau-${i}`,
          ue,
          enseignant,
          groupe: groupeChoisi,
          salle: salleChoisie,
          jour,
          date: dateDuJour(jour),
          heureDebut: segment.heureDebut,
          heureFin: segment.heureFin,
          statut: creneau?.statut ?? "normal",
          // Aperçu local pour le calcul de conflits en direct : la révision
          // n'a de sens qu'une fois enregistrée côté serveur.
          version: creneau?.version ?? 0,
        });
        i++;
      }
    }
    return resultats;
  }, [
    creneau,
    modeEdition,
    groupeChoisi,
    salleChoisie,
    jours,
    dateDuJour,
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
    (!nouvelEnseignant.nom.trim() || !nouvelEnseignant.prenom.trim());
  const nouvelleUeIncomplete = ueId === NOUVELLE_UE && !ueIntituleLibre.trim();

  const peutEnregistrer =
    creneauxApercu.length > 0 &&
    heureFin > heureDebut &&
    !motifManquant &&
    !derogationManquante &&
    !nouvelEnseignantIncomplet &&
    !nouvelleUeIncomplete &&
    !enCours;

  // Le bouton "Enregistrer" reste cliquable même quand une condition manque
  // (cf. retour utilisateur du 2026-08-18 : un bouton simplement grisé, sans
  // explication, donne l'impression que l'enregistrement est cassé). Au
  // clic, on affiche laquelle des conditions ci-dessus bloque encore.
  function messageBlocage(): string | null {
    // Chaque cause possible de creneauxApercu.length === 0 est vérifiée
    // séparément : un message générique ("sélectionnez un cours et un
    // enseignant") laissait deviner lequel des 5 champs posait problème —
    // souvent aucun des deux qu'il citait (retour utilisateur du 2026-08-18).
    if (!groupeChoisi) return "Aucun groupe disponible pour ce programme.";
    if (!salleChoisie) return "Sélectionnez une salle.";
    if (jours.size === 0) return "Sélectionnez au moins un jour.";
    if (ueId !== NOUVELLE_UE && !unitesEnseignement.find((u) => u.id === ueId))
      return "Sélectionnez un cours : cliquez sur un résultat dans la liste sous le champ de recherche.";
    if (enseignantId !== NOUVEL_ENSEIGNANT && !enseignants.find((e) => e.id === enseignantId))
      return "Sélectionnez un enseignant.";
    if (creneauxApercu.length === 0) return "Complétez les informations du cours avant d'enregistrer.";
    if (heureFin <= heureDebut) return "L'heure de fin doit être après l'heure de début.";
    if (nouvelleUeIncomplete) return "Précisez l'intitulé du nouveau cours.";
    if (nouvelEnseignantIncomplet) return "Complétez le nom et le prénom du nouvel enseignant.";
    if (motifManquant) return "Le motif de la modification est obligatoire (champ ci-dessous).";
    if (derogationManquante)
      return "Un motif de dérogation est obligatoire : ce créneau est encore en conflit (champ ci-dessous).";
    return null;
  }

  async function resoudreUe(): Promise<UniteEnseignement | null> {
    if (ueId !== NOUVELLE_UE) {
      return unitesEnseignement.find((u) => u.id === ueId) ?? null;
    }

    const reponse = await apiFetch("/cours", {
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

    const reponse = await apiFetch("/enseignants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouvelEnseignant),
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible d'enregistrer cet enseignant.");
      return null;
    }
    onEnseignantCree(data.enseignant);
    return data.enseignant as Enseignant;
  }

  async function handleEnregistrer() {
    const blocage = messageBlocage();
    if (blocage) {
      setErreur(blocage);
      return;
    }
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
            <label className="text-base font-semibold text-text">Unité d&apos;enseignement</label>
            {ueSelectionnee ? (
              <p className="mt-1 text-xs text-text-muted">
                Sélectionné : <span className="font-medium text-text">{ueSelectionnee.intitule}</span> (
                {ueSelectionnee.code})
              </p>
            ) : null}
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
                aria-hidden="true"
              />
              <input
                type="text"
                value={ueRecherche}
                onChange={(e) => setUeRecherche(e.target.value)}
                placeholder="Rechercher un cours par code ou intitulé..."
                className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
              {uesFiltrees.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-muted">
                  Aucun cours ne correspond à « {ueRecherche} ».
                </p>
              ) : (
                uesFiltrees.map((ue) => (
                  <button
                    key={ue.id}
                    type="button"
                    onClick={() => setUeId(ue.id)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-muted ${
                      ueId === ue.id ? "bg-brand/10 font-medium text-brand" : "text-text"
                    }`}
                  >
                    <span>{ue.intitule}</span>
                    <span className="shrink-0 text-xs text-text-subtle">{ue.code}</span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => setUeId(NOUVELLE_UE)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                  ueId === NOUVELLE_UE ? "bg-brand/10 font-medium text-brand" : "text-text-muted"
                }`}
              >
                + Autre (préciser)
              </button>
            </div>
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

          {/* Enseignant — liste recherchable (FR-FILT-04) */}
          <div>
            <label className="text-base font-semibold text-text">Enseignant</label>
            {enseignantSelectionne ? (
              <p className="mt-1 text-xs text-text-muted">
                Sélectionné :{" "}
                <span className="font-medium text-text">
                  {enseignantSelectionne.prenom} {enseignantSelectionne.nom}
                </span>
              </p>
            ) : null}
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
                aria-hidden="true"
              />
              <input
                type="text"
                value={enseignantRecherche}
                onChange={(e) => setEnseignantRecherche(e.target.value)}
                placeholder="Rechercher un enseignant par nom..."
                className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border">
              {enseignantsFiltres.length === 0 ? (
                // Le dire explicitement plutôt que d'afficher une liste vide :
                // c'est la réponse à la question « est-ce qu'il existe déjà ? ».
                <p className="px-3 py-2 text-sm text-text-muted">
                  Aucun enseignant ne correspond à « {enseignantRecherche} ».
                </p>
              ) : (
                enseignantsFiltres.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEnseignantId(e.id)}
                    className={`block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-muted ${
                      enseignantId === e.id ? "bg-brand/10 font-medium text-brand" : "text-text"
                    }`}
                  >
                    {e.prenom} {e.nom}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => setEnseignantId(NOUVEL_ENSEIGNANT)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                  enseignantId === NOUVEL_ENSEIGNANT ? "bg-brand/10 font-medium text-brand" : "text-text-muted"
                }`}
              >
                + Nouvel enseignant
              </button>
            </div>
            {enseignantId === NOUVEL_ENSEIGNANT ? (
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3">
                <p className="text-xs text-text-muted">
                  Enregistre une fiche dans le référentiel. L&apos;enseignant n&apos;a pas de compte : il consulte le
                  programme public comme tout le monde.
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
              </div>
            ) : null}
          </div>

          {/* Groupe — jamais modifiable ici, cf. commentaire sur groupeChoisi */}
          <div>
            <label className="text-base font-semibold text-text">Groupe</label>
            <p className="mt-1 w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text">
              {groupeChoisi ? `${groupeChoisi.nom} (${groupeChoisi.effectif} étudiants)` : "—"}
            </p>
          </div>

          {/* Salle — liste recherchable (FR-FILT-04) */}
          <div>
            <label className="text-base font-semibold text-text">Salle</label>
            {salleChoisie ? (
              <p className="mt-1 text-xs text-text-muted">
                Sélectionnée :{" "}
                <span className="font-medium text-text">
                  {salleChoisie.nom} — {salleChoisie.capacite} places
                </span>
                {groupeChoisi && groupeChoisi.effectif > salleChoisie.capacite ? (
                  // RM-02 : le moteur de conflits le signalera de toute
                  // façon, mais le dire ici évite au Gestionnaire d'aller
                  // jusqu'à l'enregistrement pour l'apprendre.
                  <span className="ml-1 font-medium text-status-warning">
                    (capacité insuffisante : {groupeChoisi.effectif} étudiants)
                  </span>
                ) : null}
              </p>
            ) : null}
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
                aria-hidden="true"
              />
              <input
                type="text"
                value={salleRecherche}
                onChange={(e) => setSalleRecherche(e.target.value)}
                placeholder="Rechercher une salle par nom ou bâtiment..."
                className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border">
              {sallesFiltrees.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-muted">
                  Aucune salle ne correspond à « {salleRecherche} ». Vérifiez qu&apos;elle est bien enregistrée dans
                  la section Salles.
                </p>
              ) : (
                sallesFiltrees.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSalleId(s.id)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-muted ${
                      salleId === s.id ? "bg-brand/10 font-medium text-brand" : "text-text"
                    }`}
                  >
                    <span>{s.nom}</span>
                    <span className="shrink-0 text-xs text-text-subtle">{s.capacite} places</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Jours */}
          <div>
            <label className="text-base font-semibold text-text">
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
          <p className="-mt-2 text-xs text-text-subtle">
            Les pauses fixes (10h00-10h15, 12h00-13h00, 15h00-15h15) sont automatiquement retirées de la
            plage saisie — un cours de 8h à 18h devient plusieurs séances séparées par ces pauses.
          </p>

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

          {erreur || erreurExterne ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
              {erreur ?? erreurExterne}
            </p>
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
                disabled={enCours}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  peutEnregistrer ? "bg-brand hover:bg-brand-hover" : "bg-text-subtle hover:bg-text-muted"
                }`}
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
