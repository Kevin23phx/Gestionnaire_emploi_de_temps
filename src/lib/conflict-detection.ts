/**
 * Moteur de détection de conflits — implémentation de référence côté frontend
 * pour la démonstration (FR-CONF-01→04, RM-01/RM-02). La version qui fait foi
 * doit vivre côté API (ConflictEngineModule, cf. 04_Exigence_Architecture
 * §3) : cette fonction est un décalque volontairement fidèle de ces mêmes
 * règles, pas une source de vérité alternative.
 */
import type { ConflitDetecte, Creneau } from "./types";

function chevauchent(a: Creneau, b: Creneau): boolean {
  if (a.jour !== b.jour) return false;
  return a.heureDebut < b.heureFin && b.heureDebut < a.heureFin;
}

export function detecterConflits(creneaux: Creneau[]): ConflitDetecte[] {
  const conflits: ConflitDetecte[] = [];

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
          description: `${a.ue.intitule} et ${b.ue.intitule} sur le même créneau (${a.jour} ${a.heureDebut}-${a.heureFin}).`,
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
      if (a.groupe.id === b.groupe.id) {
        conflits.push({
          id: `conflit-groupe-${a.id}-${b.id}`,
          type: "groupe",
          gravite: "bloquant",
          titre: `Double cours — ${a.groupe.nom}`,
          description: `${a.groupe.nom} est affecté à deux cours simultanés.`,
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
        description: `Groupe ${c.groupe.nom} (${c.groupe.effectif} pers.) assigné dans une salle de ${c.salle.capacite} places.`,
        creneauxConcernes: [c.id],
      });
    }
  }

  return conflits;
}
