/**
 * Pauses fixes de l'UFR pilote — identiques tous les jours (décision de
 * cadrage 2026-08-17). Un créneau ne doit jamais "contenir" une pause : une
 * plage saisie qui en chevauche une est automatiquement scindée en séances
 * distinctes de part et d'autre, plutôt que stockée comme un seul bloc qui
 * engloberait la pause.
 */
export interface Pause {
  debut: string; // "10:00"
  fin: string; // "10:15"
  label: string;
}

export const PAUSES: Pause[] = [
  { debut: "10:00", fin: "10:15", label: "Pause" },
  { debut: "12:00", fin: "13:00", label: "Pause déjeuner" },
  { debut: "15:00", fin: "15:15", label: "Pause" },
];

interface Segment {
  heureDebut: string;
  heureFin: string;
}

// Découpe [heureDebut, heureFin) en segments qui évitent chaque pause fixe.
// Une plage entièrement contenue dans une pause (ex. 12:00-13:00 pile) donne
// une liste vide — le formulaire traite déjà "aucun segment" comme "rien à
// enregistrer", donc aucun cas particulier n'est nécessaire côté appelant.
export function decouperSelonPauses(heureDebut: string, heureFin: string): Segment[] {
  const segments: Segment[] = [];
  let curseur = heureDebut;

  const pausesTriees = [...PAUSES].sort((a, b) => (a.debut < b.debut ? -1 : 1));

  for (const pause of pausesTriees) {
    if (pause.debut >= heureFin || pause.fin <= curseur) continue;
    if (pause.debut > curseur) {
      segments.push({ heureDebut: curseur, heureFin: pause.debut });
    }
    if (pause.fin > curseur) curseur = pause.fin;
  }

  if (curseur < heureFin) {
    segments.push({ heureDebut: curseur, heureFin });
  }

  return segments;
}
