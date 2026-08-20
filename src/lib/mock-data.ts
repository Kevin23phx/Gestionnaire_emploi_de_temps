/**
 * Données factices — permettent de construire et démontrer le frontend
 * indépendamment de l'avancement du backend NestJS. À retirer/brancher sur
 * l'API réelle une fois celle-ci disponible (voir README.md, section "Contrat API").
 */
import type {
  AuditEntry,
  Creneau,
  DashboardStats,
  DemandeEnseignant,
  Enseignant,
  Etudiant,
  Groupe,
  NotificationItem,
  Salle,
  UniteEnseignement,
  Utilisateur,
} from "./types";

const UE_ALGO: UniteEnseignement = { id: "ue-algo", code: "INFO301", intitule: "Algorithmique Avancée" };
const UE_BDD: UniteEnseignement = { id: "ue-bdd", code: "INFO302", intitule: "Bases de Données (TP)" };
const UE_RESEAUX: UniteEnseignement = { id: "ue-reseaux", code: "INFO303", intitule: "Réseaux I" };
const UE_PROG_C: UniteEnseignement = { id: "ue-prog-c", code: "INFO201", intitule: "Programmation C" };

export const MOCK_UNITES_ENSEIGNEMENT: UniteEnseignement[] = [UE_ALGO, UE_BDD, UE_RESEAUX, UE_PROG_C];

export const MOCK_UTILISATEURS: (Utilisateur & { motDePasse: string; identifiant: string })[] = [
  {
    id: "u-etu-1",
    identifiant: "20230145",
    motDePasse: "password",
    nom: "Ouédraogo",
    prenom: "Aïcha",
    role: "etudiant",
    groupeId: "g-l3-info-a",
  },
  {
    id: "u-ens-1",
    identifiant: "kabore.enseignant",
    motDePasse: "password",
    nom: "Kaboré",
    prenom: "Ismaël",
    role: "enseignant",
    enseignantId: "e-kabore",
  },
  {
    id: "u-sco-1",
    identifiant: "scolarite.info",
    motDePasse: "password",
    nom: "Savadogo",
    prenom: "Rasmata",
    role: "scolarite",
  },
];

// "effectif" est calculé ci-dessous à partir de MOCK_ETUDIANTS, jamais saisi
// à la main — cf. commentaire sur Groupe.effectif dans types.ts. Les 0
// initiaux ne sont qu'un point de départ, corrigés juste après la
// définition de MOCK_ETUDIANTS.
export const MOCK_GROUPES: Groupe[] = [
  { id: "g-l3-info-a", nom: "L3 INFO - Groupe A", filiere: "Informatique", niveau: "L3", effectif: 0 },
  { id: "g-l2-info-td1", nom: "L2 INFO - TD 1", filiere: "Informatique", niveau: "L2", effectif: 0 },
];

export const MOCK_ENSEIGNANTS: Enseignant[] = [
  { id: "e-kabore", nom: "Kaboré", prenom: "Ismaël" },
  { id: "e-traore", nom: "Traoré", prenom: "Moussa" },
  { id: "e-sawadogo", nom: "Sawadogo", prenom: "Boukary" },
];

// Référentiel des étudiants (FR-REF-01) — représente ce qu'un import
// campus-wide apporterait : la majorité déjà rattachée à un groupe, mais
// aussi un petit lot fraîchement importé et pas encore trié (groupeId
// absent) — cas réel à chaque rentrée, avant que la scolarité ait fini de
// répartir la nouvelle promotion en groupes.
export const MOCK_ETUDIANTS: Etudiant[] = [
  // L3 INFO - Groupe A — "20230145" correspond au compte de démo étudiant
  // (MOCK_UTILISATEURS ci-dessus), pour que la connexion et le référentiel
  // scolarité racontent la même histoire.
  { id: "et-1", ine: "20230145", nom: "Ouédraogo", prenom: "Aïcha", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-2", ine: "20230101", nom: "Kaboré", prenom: "Awa", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-3", ine: "20230102", nom: "Zongo", prenom: "Issa", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-4", ine: "20230103", nom: "Compaoré", prenom: "Fatoumata", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-5", ine: "20230104", nom: "Ouattara", prenom: "Boureima", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-6", ine: "20230105", nom: "Nikiéma", prenom: "Salamata", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-7", ine: "20230106", nom: "Bamogo", prenom: "Yacouba", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },
  { id: "et-8", ine: "20230107", nom: "Ilboudo", prenom: "Nathalie", filiere: "Informatique", niveau: "L3", groupeId: "g-l3-info-a" },

  // L2 INFO - TD 1
  { id: "et-9", ine: "20240201", nom: "Sanou", prenom: "Abdoulaye", filiere: "Informatique", niveau: "L2", groupeId: "g-l2-info-td1" },
  { id: "et-10", ine: "20240202", nom: "Congo", prenom: "Aminata", filiere: "Informatique", niveau: "L2", groupeId: "g-l2-info-td1" },
  { id: "et-11", ine: "20240203", nom: "Kagambega", prenom: "Rasmané", filiere: "Informatique", niveau: "L2", groupeId: "g-l2-info-td1" },
  { id: "et-12", ine: "20240204", nom: "Tapsoba", prenom: "Mariam", filiere: "Informatique", niveau: "L2", groupeId: "g-l2-info-td1" },
  { id: "et-13", ine: "20240205", nom: "Ky", prenom: "Adama", filiere: "Informatique", niveau: "L2", groupeId: "g-l2-info-td1" },
  { id: "et-14", ine: "20240206", nom: "Kologo", prenom: "Hawa", filiere: "Informatique", niveau: "L2", groupeId: "g-l2-info-td1" },

  // Fraîchement importés, pas encore affectés à un groupe.
  { id: "et-15", ine: "20250301", nom: "Ouédraogo", prenom: "Boukary", filiere: "Électricité", niveau: "L1" },
  { id: "et-16", ine: "20250302", nom: "Sawadogo", prenom: "Aïda", filiere: "Électricité", niveau: "L1" },
  { id: "et-17", ine: "20250303", nom: "Traoré", prenom: "Inoussa", filiere: "Électricité", niveau: "L1" },
  { id: "et-18", ine: "20250304", nom: "Kaboré", prenom: "Ramata", filiere: "Électricité", niveau: "L1" },
];

// Mutation en place (pas de remplacement d'entrée dans MOCK_GROUPES) : les
// créneaux du seed (MOCK_CRENEAUX_SCOLARITE) embarquent une référence directe
// vers ces mêmes objets Groupe (cf. "groupe: MOCK_GROUPES[0]" plus bas), donc
// muter le champ ici suffit à ce qu'ils restent synchronisés eux aussi, sans
// code supplémentaire — uniquement pour les créneaux jamais réenregistrés
// depuis (un POST /api/creneaux reçoit un objet Groupe déjà sérialisé par le
// fetch initial, qui rompt ce partage de référence).
export function recalculerEffectif(groupeId: string) {
  const groupe = MOCK_GROUPES.find((g) => g.id === groupeId);
  if (!groupe) return;
  groupe.effectif = MOCK_ETUDIANTS.filter((e) => e.groupeId === groupeId).length;
}

for (const groupe of MOCK_GROUPES) {
  recalculerEffectif(groupe.id);
}

export const MOCK_SALLES: Salle[] = [
  { id: "s-amphi-a", nom: "Amphi A", batiment: "Amphis Centraux", capacite: 1000, structureGestionnaire: "UFR_PILOTE", typeUsage: "commune" },
  { id: "s-102", nom: "Salle 102", batiment: "UFR/SEA", capacite: 40, structureGestionnaire: "UFR_PILOTE", typeUsage: "propre" },
  { id: "s-labo-info-1", nom: "Labo Info 1", batiment: "UFR/SEA", capacite: 30, structureGestionnaire: "UFR_PILOTE", typeUsage: "propre" },
  { id: "s-402", nom: "Salle 402", batiment: "UFR/SEA", capacite: 70, structureGestionnaire: "UFR_PILOTE", typeUsage: "propre" },
];

export const MOCK_CRENEAUX: Creneau[] = [
  {
    id: "c-1",
    ue: UE_ALGO,
    enseignant: MOCK_ENSEIGNANTS[0],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[0],
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "10:00",
    statut: "normal",
  },
  // Scindé en deux séances autour de la pause de 10h00-10h15 (aucun créneau
  // ne doit chevaucher une pause fixe, cf. décision de cadrage 2026-08-17).
  {
    id: "c-2a",
    ue: UE_BDD,
    enseignant: MOCK_ENSEIGNANTS[1],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[3],
    jour: "mardi",
    heureDebut: "09:00",
    heureFin: "10:00",
    statut: "modifie",
    motif: "Changement de salle demandé par l'enseignant",
  },
  {
    id: "c-2b",
    ue: UE_BDD,
    enseignant: MOCK_ENSEIGNANTS[1],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[3],
    jour: "mardi",
    heureDebut: "10:15",
    heureFin: "12:00",
    statut: "modifie",
    motif: "Changement de salle demandé par l'enseignant",
  },
  {
    id: "c-3",
    ue: UE_RESEAUX,
    enseignant: MOCK_ENSEIGNANTS[2],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[1],
    jour: "mercredi",
    heureDebut: "07:00",
    heureFin: "09:00",
    statut: "annule",
    motif: "Absence enseignant",
  },
];

// Jeu de données dédié à la vue "Emploi du temps" de la Scolarité : contient
// volontairement un conflit de salle et un conflit de capacité, pour démontrer
// FR-CONF-01 et FR-CONF-04 sans perturber les vues étudiant/enseignant ci-dessus.
export const MOCK_CRENEAUX_SCOLARITE: Creneau[] = [
  {
    id: "c-admin-1",
    ue: UE_ALGO,
    enseignant: MOCK_ENSEIGNANTS[0],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[0],
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "10:00",
    statut: "normal",
  },
  {
    // FR-CONF-01 : même salle (Amphi A), même créneau que c-admin-1.
    id: "c-admin-2",
    ue: UE_PROG_C,
    enseignant: MOCK_ENSEIGNANTS[1],
    groupe: MOCK_GROUPES[1],
    salle: MOCK_SALLES[0],
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "10:00",
    statut: "normal",
  },
  {
    // FR-CONF-04 : groupe de 65 dans une salle de 40 places.
    // Décalé de 10:00 à 10:15 pour ne pas chevaucher la pause fixe du matin
    // (cf. decouperSelonPauses, décision de cadrage 2026-08-17).
    id: "c-admin-3",
    ue: UE_BDD,
    enseignant: MOCK_ENSEIGNANTS[2],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[1],
    jour: "mardi",
    heureDebut: "10:15",
    heureFin: "12:00",
    statut: "normal",
  },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    type: "modifie",
    titre: "Modification d'horaire",
    description: "Cours de Bases de Données (L3 INFO A) déplacé, nouvelle salle : Salle 402.",
    dateHeure: "2026-08-12T10:45:00Z",
    lue: false,
  },
  {
    id: "n-2",
    type: "annule",
    titre: "Cours annulé",
    description: "Réseaux I annulé ce mercredi (absence enseignant).",
    dateHeure: "2026-08-12T09:12:00Z",
    lue: false,
  },
];

export const MOCK_DEMANDES: DemandeEnseignant[] = [
  {
    id: "d-1",
    enseignant: MOCK_ENSEIGNANTS[0],
    type: "report",
    statut: "en_attente",
    creneauConcerne: "c-1",
    motif: "Conférence internationale",
  },
];

export const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "a-1",
    auteur: "Savadogo.Rasmata",
    dateHeure: "2026-08-12T14:32:00Z",
    action: "Modification salle - INFO301",
    motif: "Conflit d'horaire avec Réseaux I",
  },
];

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  tauxOccupationSalles: 78,
  conflitsDetectes: 12,
  conflitsResolus: 8,
  coursAnnulesPeriode: 5,
};
