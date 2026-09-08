/**
 * Contrat de données Campus Manager — V3, programme public.
 * Dérivé de 02_SRS_Campus_Manager.md et 03_Contrat_Invariants_Campus_Manager.md.
 * Ce fichier est la référence partagée avec le backend (Django/DRF,
 * `backend_django/`) : toute évolution doit y être répercutée.
 *
 * [V3] Deux familles de types désormais, et il faut résister à la tentation
 * de les fusionner : les types de GESTION (Creneau, Groupe, Salle...),
 * qui circulent derrière une authentification, et les types PUBLICS
 * (ProgrammePublic, SeancePublique), volontairement plus pauvres. La
 * surface publique n'expose jamais un `Groupe` complet ni un `Creneau`
 * complet — un effectif ou un identifiant d'étudiant n'a rien à faire sur
 * Internet (INV-12/INT-10). Les garder séparés ici est le pendant, côté
 * client, de la séparation des sérialiseurs côté serveur.
 */

// RM-03 (V3) : un compte a exactement un rôle parmi ces 2. Les rôles
// "etudiant" et "enseignant" ont été retirés le 2026-09-07 avec les comptes
// correspondants — le programme se consulte sans compte.
export type Role = "scolarite" | "admin";

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

// [V3.2] Un ÉTABLISSEMENT de l'UJKZ : 5 UFR, 6 instituts (IBAM, ISSP,
// IFOAD, ISSDH, IGEDD, IPERMIC) et 1 école doctorale (EDICC). La V2 avait
// restreint le périmètre aux 5 UFR ; cette restriction est levée.
//
// Le type garde son nom historique `Ufr` — comme le modèle et la table
// côté backend — parce que `ufrId` traverse tout le contrat d'API. Mais
// tout ce que l'utilisateur LIT dit « établissement » : demander « votre
// UFR » à un étudiant de l'IBAM n'aurait pas de sens.
export type TypeEtablissement = "ufr" | "institut" | "ecole_doctorale";

export interface Ufr {
  id: string;
  nom: string;
  sigle: string; // code court, minuscules — sert à scolarite.<sigle>
  type: TypeEtablissement;
  // "UFR/SH" pour une UFR, "IBAM" pour un institut. Composé côté serveur :
  // la règle de préfixe dépend du type et ne doit exister qu'à un endroit.
  sigleAffiche: string;
  // [V3] FR-REF-16/17 : période académique EN COURS de cette UFR. Borne la
  // navigation par semaine et la récurrence du flux calendrier. `null` tant
  // que le Gestionnaire ne l'a pas renseignée.
  periodeLibelle?: string | null;
  periodeDebut?: string | null; // "AAAA-MM-JJ"
  periodeFin?: string | null;
}

// Réponse de GET /api/ufrs — inclut le statut du compte Gestionnaire pour
// l'écran de supervision Admin.
export interface UfrAvecGestionnaire extends Ufr {
  gestionnaire: { identifiant: string; active: boolean } | null;
}

// [V3.2] FR-REF-20 : département officiel d'un établissement — ce que le
// projet appelle « filière » côté groupe. Référentiel réel de l'UJKZ
// (53 entrées), et non plus une liste déduite des groupes déjà saisis.
export interface Departement {
  id: string;
  libelle: string;
  ufrId: string;
}

export interface Groupe {
  id: string;
  nom: string; // ex. "L3 INFO - Groupe A"
  filiere: string;
  niveau: string;
  // FR-REF-12 : année EN COURS de ce groupe précis (ex. "2025-2026").
  // Une promotion (L1→L2) se fait en créant un nouveau Groupe pour la
  // nouvelle année, pas en modifiant celui-ci sur place.
  anneeAcademique: string;
  ufrId: string; // INT-07 : toujours rattaché à exactement une UFR
  // [V3.1] Nombre d'étudiants, SAISI par le gestionnaire. Était auparavant
  // dérivé d'un référentiel nominatif d'étudiants, supprimé depuis : le
  // système n'en consommait que le nombre, comparé à la capacité d'une
  // salle (RM-02). N'est donc plus vérifiable — il vaut ce qui a été saisi.
  effectif: number;
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
  // [V3] INV-13 : numéro de révision, incrémenté à chaque écriture.
  version: number;
  // [V3] FR-EDT-07 : séances annulées à une date précise. Distinctes de
  // `statut: "annule"`, qui retire le cours de toute la période (RM-10).
  seancesAnnulees: SeanceAnnulee[];
}

// [V3] FR-EDT-07 / INV-14
export interface SeanceAnnulee {
  date: string; // "AAAA-MM-JJ"
  motif: string;
  annulePar: string;
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

// ---------------------------------------------------------------------------
// [V3] Types de la surface publique (FR-PUB-01→09)
// ---------------------------------------------------------------------------
// Délibérément plus pauvres que leurs équivalents de gestion : ce qui n'est
// pas ici ne peut pas fuiter. Voir l'en-tête de ce fichier.

// "annule_seance" : cette séance-ci est annulée, le cours a bien lieu les
// autres semaines (INV-14). "annule" : le cours est retiré de toute la
// période académique. Les confondre à l'affichage reviendrait à dire à
// l'étudiant que son cours est supprimé alors que l'enseignant est
// simplement absent un jour.
export type StatutSeance = StatutCreneau | "annule_seance";

export interface SeancePublique {
  id: string;
  date: string; // "AAAA-MM-JJ"
  jour: Creneau["jour"];
  heureDebut: string;
  heureFin: string;
  ue: { code: string | null; intitule: string; niveau: string };
  enseignant: string; // "Prénom Nom" — jamais un objet identifiable
  salle: { nom: string; batiment: string };
  statut: StatutSeance;
  motif: string | null;
}

export interface ProgrammePublic {
  groupe: {
    id: string;
    nom: string;
    filiere: string;
    niveau: string;
    anneeAcademique: string;
    ufr: Ufr;
  };
  semaine: {
    lundi: string;
    samedi: string;
    periodeDebut: string | null;
    periodeFin: string | null;
    periodeLibelle: string | null;
    horsPeriode: boolean;
  };
  seances: SeancePublique[];
}

// Dernier étage de la cascade FR-PUB-02.
export interface GroupePublic {
  id: string;
  nom: string;
  filiere: string;
  niveau: string;
  anneeAcademique: string;
  nbCreneaux: number;
}

// FR-PUB-04 : ce qu'on garde dans le stockage local du visiteur. Assez pour
// réafficher le favori sans appel réseau (mode hors-ligne, FR-PUB-09), et
// rien de plus — aucune donnée personnelle n'est jamais stockée.
export interface Favori {
  groupeId: string;
  nom: string;
  filiere: string;
  niveau: string;
  ufrSigle: string;
  ajouteLe: string; // ISO 8601
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
