/**
 * Moteur de détection de conflits — implémentation de référence côté frontend
 * pour la démonstration (FR-CONF-01→04, RM-01/RM-02). La version qui fait foi
 * doit vivre côté API (ConflictEngineModule, cf. 04_Exigence_Architecture
 * §3) : cette fonction est un décalque volontairement fidèle de ces mêmes
 * règles, pas une source de vérité alternative.
 */
import type { ConflitDetecte, Creneau } from "./types";

// [V4] `date` porte la vraie journée ("AAAA-MM-JJ") ; `jour` n'en est
// qu'un libellé dérivé pour l'affichage, partagé par toutes les semaines
// ("lundi" vaut pour chacune d'elles). Comparer sur `jour` faisait donc
// entrer en conflit deux créneaux à des semaines d'écart dès qu'ils
// tombaient sur le même nom de jour — corrigé pour comparer la date.
function chevauchent(a: Creneau, b: Creneau): boolean {
  if (a.date !== b.date) return false;
  return a.heureDebut < b.heureFin && b.heureDebut < a.heureFin;
}

/**
 * [V8.1] Deux créneaux d'un MÊME groupe concernent-ils les mêmes étudiants ?
 *
 * Décalque EXACT de `_memes_etudiants` dans
 * backend_django/conflict_engine/services.py, qui reste la version faisant
 * foi. Les deux doivent dire la même chose, sans quoi l'écran annoncerait
 * un conflit que le serveur accepte (ou l'inverse) — et le Gestionnaire ne
 * saurait plus lequel croire.
 *
 * - aucun des deux n'a de spécialité → toute la promotion : conflit ;
 * - un seul en a une → le cours commun concerne aussi ces étudiants-là :
 *   conflit ;
 * - les deux, la même → même sous-population : conflit ;
 * - les deux, différentes → sous-populations disjointes : PAS de conflit.
 *   C'est le cas normal d'une L2 de portail où Maths et Chimie tombent à
 *   la même heure.
 */
function memesEtudiants(a: Creneau, b: Creneau): boolean {
  if (!a.specialite || !b.specialite) return true;
  return a.specialite.toLowerCase() === b.specialite.toLowerCase();
}

/** Nomme la sous-population réellement en cause dans un conflit de groupe. */
function qui(a: Creneau, b: Creneau): string {
  const specialite = a.specialite || b.specialite;
  return specialite ? `${a.groupe.nom} — ${specialite}` : a.groupe.nom;
}

export function detecterConflits(tous: Creneau[]): ConflitDetecte[] {
  const conflits: ConflitDetecte[] = [];

  // Une séance annulée libère sa salle, son enseignant et son groupe : elle
  // n'entre dans aucune vérification, exactement comme côté serveur
  // (conflict_engine/services.py). Sans ce filtre, reprogrammer un cours à
  // la place d'une séance annulée — le geste le plus naturel après une
  // annulation — affichait un faux conflit « bloquant » et exigeait un
  // motif de dérogation que le serveur jetait ensuite, faute de conflit réel.
  const creneaux = tous.filter((c) => c.statut !== "annule");

  for (let i = 0; i < creneaux.length; i++) {
    for (let j = i + 1; j < creneaux.length; j++) {
      const a = creneaux[i];
      const b = creneaux[j];
      if (!chevauchent(a, b)) continue;

      // FR-CONF-01 : conflit de salle
      if (a.salle.id === b.salle.id) {
        conflits.push({
          id: `conflit-salle-${a.id}-${b.id}`,
          type: "salle",
          gravite: "bloquant",
          titre: `Double réservation — ${a.salle.nom}`,
          description: `${a.ue.intitule} et ${b.ue.intitule} sur le même créneau (${a.date} ${a.heureDebut}-${a.heureFin}).`,
          creneauxConcernes: [a.id, b.id],
        });
      }

      // FR-CONF-02 : conflit d'enseignant
      if (a.enseignant.id === b.enseignant.id) {
        conflits.push({
          id: `conflit-enseignant-${a.id}-${b.id}`,
          type: "enseignant",
          gravite: "bloquant",
          titre: `Double affectation — ${a.enseignant.prenom} ${a.enseignant.nom}`,
          description: `${a.enseignant.prenom} ${a.enseignant.nom} est affecté à deux créneaux simultanés.`,
          creneauxConcernes: [a.id, b.id],
        });
      }

      // FR-CONF-03 : conflit de groupe
      // [V8.1] Seulement si les deux créneaux concernent les MÊMES
      // étudiants — voir `memesEtudiants` plus bas.
      if (a.groupe.id === b.groupe.id && memesEtudiants(a, b)) {
        conflits.push({
          id: `conflit-groupe-${a.id}-${b.id}`,
          type: "groupe",
          gravite: "bloquant",
          titre: `Double cours — ${qui(a, b)}`,
          description: `${qui(a, b)} est affecté à deux cours simultanés.`,
          creneauxConcernes: [a.id, b.id],
        });
      }
    }
  }

  // FR-CONF-04 : conflit de capacité (RM-02), indépendant des chevauchements.
  for (const c of creneaux) {
    if (c.groupe.effectif > c.salle.capacite) {
      conflits.push({
        id: `conflit-capacite-${c.id}`,
        type: "capacite",
        gravite: "avertissement",
        titre: `Capacité dépassée — ${c.salle.nom}`,
        description: `Groupe ${c.groupe.nom} (${c.groupe.effectif} pers.) assigné dans une salle de ${c.salle.capacite} places (${c.date} ${c.heureDebut}-${c.heureFin}).`,
        creneauxConcernes: [c.id],
      });
    }
  }

  return conflits;
}
