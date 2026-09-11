/**
 * [V3.1] Valeurs proposées dans les listes déroulantes du formulaire de
 * groupe (FR-REF-12/13).
 *
 * Retour du porteur de projet : « je veux une liste déroulante de telle
 * sorte que le gestionnaire sélectionne au lieu de saisir ». Saisir
 * « informatique », « Informatique » et « INFO » à trois semaines
 * d'intervalle crée trois départements distincts dans la cascade publique
 * (FR-PUB-02), et l'étudiant se retrouve devant trois entrées pour une
 * seul département réel. La liste déroulante n'est donc pas un confort de
 * saisie : c'est ce qui garde la cascade lisible.
 */

/** Niveaux du LMD — liste close, elle ne varie pas d'une UFR à l'autre. */
export const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"] as const;

/**
 * Années académiques autour de l'année en cours. Calculées plutôt
 * qu'écrites en dur : une liste figée deviendrait fausse en silence à la
 * rentrée suivante, et personne ne s'en apercevrait avant de ne plus
 * pouvoir créer le groupe de la nouvelle promotion.
 *
 * L'année universitaire bascule en août : avant, on est encore dans
 * l'année commencée l'an dernier.
 */
export function anneesAcademiques(reference = new Date()): string[] {
  const anneeDeDepart = reference.getMonth() >= 7 ? reference.getFullYear() : reference.getFullYear() - 1;
  return [-1, 0, 1].map((decalage) => {
    const debut = anneeDeDepart + decalage;
    return `${debut}-${debut + 1}`;
  });
}

/** Valeur sentinelle de l'option « + Autre » d'une liste déroulante. */
export const AUTRE = "__autre__";
