/**
 * Contrat de données Campus Manager — MVP (UFR pilote).
 * Dérivé de 02_SRS_Campus_Manager.md et 03_Contrat_Invariants_Campus_Manager.md.
 * Ce fichier est la référence partagée avec le backend (NestJS) : toute évolution
 * doit être répercutée côté API pour que les deux équipes restent synchronisées.
 */

// RM-03 : un compte a exactement un rôle parmi ces 3 pour le MVP.
export type Role = "etudiant" | "enseignant" | "scolarite";

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  role: Role;
  // Étudiant uniquement
  groupeId?: string;
  // Enseignant uniquement
  enseignantId?: string;
}

export interface Groupe {
  id: string;
  nom: string; // ex. "L3 INFO - Groupe A"
  filiere: string;
  niveau: string;
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
  groupeId?: string;
}

export interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
}

// FR-REF-02/03 : chaque salle porte capacité, structure gestionnaire et type d'usage.
export type StructureGestionnaire = "UFR_PILOTE"; // seule valeur possible pour le MVP (RM-05)
export type TypeUsageSalle = "propre" | "commune" | "louee" | "gratuite";

export interface Salle {
  id: string;
  nom: string;
  batiment: string;
  capacite: number;
  structureGestionnaire: StructureGestionnaire;
  typeUsage: TypeUsageSalle;
}

export interface UniteEnseignement {
  id: string;
  code: string;
  intitule: string;
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
  creneauConcerne: string; // ID de créneau
  creneauPropose?: string; // ID de créneau (report/permutation)
  motif: string;
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
