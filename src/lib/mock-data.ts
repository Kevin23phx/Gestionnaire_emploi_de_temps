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

export const MOCK_GROUPES: Groupe[] = [
  { id: "g-l3-info-a", nom: "L3 INFO - Groupe A", filiere: "Informatique", niveau: "L3", effectif: 65 },
  { id: "g-l2-info-td1", nom: "L2 INFO - TD 1", filiere: "Informatique", niveau: "L2", effectif: 45 },
];

export const MOCK_ENSEIGNANTS: Enseignant[] = [
  { id: "e-kabore", nom: "Kaboré", prenom: "Ismaël" },
  { id: "e-traore", nom: "Traoré", prenom: "Moussa" },
  { id: "e-sawadogo", nom: "Sawadogo", prenom: "Boukary" },
];

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
  {
    id: "c-2",
    ue: UE_BDD,
    enseignant: MOCK_ENSEIGNANTS[1],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[3],
    jour: "mardi",
    heureDebut: "09:00",
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
    id: "c-admin-3",
    ue: UE_BDD,
    enseignant: MOCK_ENSEIGNANTS[2],
    groupe: MOCK_GROUPES[0],
    salle: MOCK_SALLES[1],
    jour: "mardi",
    heureDebut: "10:00",
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
