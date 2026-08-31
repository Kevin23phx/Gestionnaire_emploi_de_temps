/**
 * Contrat de données Campus Manager — V2 multi-UFR.
 * Dérivé de 02_SRS_Campus_Manager.md et 03_Contrat_Invariants_Campus_Manager.md.
 * Ce fichier est la référence partagée avec le backend (NestJS) : toute évolution
 * doit être répercutée côté API pour que les deux équipes restent synchronisées.
 */

// RM-03 (V2) : un compte a exactement un rôle parmi ces 4.
export type Role = "etudiant" | "enseignant" | "scolarite" | "admin";

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  role: Role;
  // Gestionnaire de scolarité uniquement (INV-10) — jamais renseigné pour
  // un Admin, qui supervise toutes les UFR sans en avoir une propre.
  ufrId?: string | null;
  // Étudiant uniquement
  groupeId?: string;
  // Enseignant uniquement
  enseignantId?: string;
}

// V2 multi-UFR : les 5 UFR réelles de l'UJKZ (SH, SDS, SVT, SEA, LAC).
export interface Ufr {
  id: string;
  nom: string;
  sigle: string;
}

// Réponse de GET /api/ufrs — inclut le statut du compte Gestionnaire pour
// l'écran de supervision Admin.
export interface UfrAvecGestionnaire extends Ufr {
  gestionnaire: { identifiant: string; active: boolean } | null;
}

export interface Groupe {
  id: string;
  nom: string; // ex. "L3 INFO - Groupe A"
  filiere: string;
  niveau: string;
  // FR-REF-12 : année EN COURS de ce groupe précis (ex. "2025-2026") —
  // distincte d'Etudiant.anneeAcademique (année d'inscription, immuable).
  // Une promotion (L1→L2) se fait en créant un nouveau Groupe pour la
  // nouvelle année, pas en modifiant celui-ci sur place.
  anneeAcademique: string;
  ufrId: string; // INT-07 : toujours rattaché à exactement une UFR
  effectif: number; // dérivé du nombre d'Etudiant.groupeId === ce groupe (cf. Etudiant) — jamais saisi à la main une fois des étudiants rattachés
}

// Référentiel des étudiants — distinct de Utilisateur (qui ne porte que le
// compte de connexion) pour la même raison qu'Enseignant en est distinct :
// la scolarité doit pouvoir importer/rattacher un étudiant à un groupe avant
// même que son compte existe. "groupeId" absent = étudiant connu du
// référentiel mais pas encore affecté à un groupe (ex. juste importé).
export interface Etudiant {
  id: string;
  ine: string; // Identifiant National de l'Étudiant — pas un "matricule" (retour utilisateur du 2026-08-18)
  nom: string;
  prenom: string;
  filiere: string;
  niveau: string;
  // FR-REF-09 : année d'inscription (ex. "2025-2026") — sert au filtrage
  // (FR-REF-11), pas à assouplir l'unicité de l'INE (FR-REF-08).
  anneeAcademique: string;
  // INV-09 : toujours rattaché à exactement une UFR ; changement réservé à
  // l'Admin (FR-ADMIN-05, POST /etudiants/:id/transferer-ufr).
  ufrId: string;
  groupeId?: string;
}

export interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  // FR-REF-06 : affectation explicite, potentiellement à plusieurs UFR —
  // absent sur les formes dénormalisées (ex. Creneau.enseignant) qui ne le
  // portent pas.
  ufrs?: { ufrId: string }[];
}

// FR-REF-02/03 (V2) : "UFR" (ufrId renseigné) ou "DEP" — salle commune/louée
// transversale, jamais rattachée à une UFR (cf. 01_PRD note 2026-08-27).
export type StructureGestionnaire = "UFR" | "DEP";
export type TypeUsageSalle = "propre" | "commune" | "louee" | "gratuite";

export interface Salle {
  id: string;
  nom: string;
  batiment: string;
  capacite: number;
  structureGestionnaire: StructureGestionnaire;
  ufrId: string | null; // null SSI structureGestionnaire === "DEP"
  typeUsage: TypeUsageSalle;
}

export interface UniteEnseignement {
  id: string;
  code: string;
  intitule: string;
  // FR-REF-13 : niveau visé par ce cours (L1...M2) — affiché en parenthèses
  // à côté de l'intitulé.
  niveau: string;
  ufrId: string;
}

// Statut visuel appliqué de façon identique sur toutes les vues (étudiant/enseignant/scolarité)
export type StatutCreneau = "normal" | "modifie" | "annule";

export interface Creneau {
  id: string;
  ue: UniteEnseignement;
  enseignant: Enseignant;
  groupe: Groupe;
  salle: Salle;
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi";
  heureDebut: string; // "08:00"
  heureFin: string; // "10:00"
  statut: StatutCreneau;
  motif?: string; // obligatoire si modifie/annule (INT-03)
}

// FR-CONF-05 : gravité bloquant ou avertissement
export type GraviteConflit = "bloquant" | "avertissement";
export type TypeConflit =
  | "salle"
  | "enseignant"
  | "groupe"
  | "capacite";

export interface ConflitDetecte {
  id: string;
  type: TypeConflit;
  gravite: GraviteConflit;
  titre: string;
  description: string;
  creneauxConcernes: string[]; // IDs de créneaux
}

export type TypeNotification = "modifie" | "annule" | "info";

export interface NotificationItem {
  id: string;
  type: TypeNotification;
  titre: string;
  description: string;
  dateHeure: string; // ISO 8601
  lue: boolean;
}

// RM-04 : une demande a exactement 3 états possibles.
export type StatutDemande = "en_attente" | "validee" | "refusee";
export type TypeDemande = "absence" | "report" | "permutation";

export interface DemandeEnseignant {
  id: string;
  enseignant: Enseignant;
  type: TypeDemande;
  statut: StatutDemande;
  creneauConcerneId: string;
  creneauProposeId?: string | null; // report/permutation
  motif: string;
  // "report" : nouvelle plage proposée (jour/heure/salle) — le créneau
  // cible n'existe pas encore avant validation par la scolarité.
  jourPropose?: Creneau["jour"] | null;
  heureDebutProposee?: string | null; // "HH:MM"
  heureFinProposee?: string | null;
  salleProposeeId?: string | null;
}

// FR-AUD-01/03 : journal d'audit, append-only (INV-04)
export interface AuditEntry {
  id: string;
  auteur: string;
  dateHeure: string; // ISO 8601
  action: string;
  motif: string;
}

export interface DashboardStats {
  tauxOccupationSalles: number; // 0-100
  conflitsDetectes: number;
  conflitsResolus: number;
  coursAnnulesPeriode: number;
}

// FR-OFF-02 : indicateur de fraîcheur des données
export interface EtatSynchronisation {
  enLigne: boolean;
  derniereSynchronisation: string; // ISO 8601
}
