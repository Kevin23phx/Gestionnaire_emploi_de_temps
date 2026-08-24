/**
 * Calcule les fenêtres libres du planning PROPRE d'un enseignant (jamais
 * occupées par un de ses cours actifs, pauses fixes déjà retirées) — ce que
 * "demander un report/permutation" doit proposer comme destinations
 * possibles, pour ne jamais suggérer un horaire déjà pris (retour
 * utilisateur : "c'est pas joli d'afficher des créneaux déjà occupés, ça va
 * poser des conflits").
 */
import type { Creneau } from "./types";
import { PAUSES } from "./pauses";

const JOURS: Creneau["jour"][] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const OUVERTURE_MINUTES = 7 * 60;
const FERMETURE_MINUTES = 18 * 60;

function versMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function versHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export interface FenetreLibre {
  jour: Creneau["jour"];
  heureDebut: string;
  heureFin: string;
}

export function calculerFenetresLibres(creneauxEnseignant: Creneau[]): FenetreLibre[] {
  const resultat: FenetreLibre[] = [];

  for (const jour of JOURS) {
    // Un créneau annulé libère la salle ET l'enseignant — jamais traité
    // comme une occupation (même logique que ConflictEngineModule côté
    // backend).
    const occupes = creneauxEnseignant
      .filter((c) => c.jour === jour && c.statut !== "annule")
      .map((c) => ({ debut: versMinutes(c.heureDebut), fin: versMinutes(c.heureFin) }));

    const blocages = [...PAUSES.map((p) => ({ debut: versMinutes(p.debut), fin: versMinutes(p.fin) })), ...occupes].sort(
      (a, b) => a.debut - b.debut,
    );

    let curseur = OUVERTURE_MINUTES;
    for (const bloc of blocages) {
      if (bloc.debut > curseur) {
        resultat.push({ jour, heureDebut: versHHMM(curseur), heureFin: versHHMM(Math.min(bloc.debut, FERMETURE_MINUTES)) });
      }
      curseur = Math.max(curseur, bloc.fin);
    }
    if (curseur < FERMETURE_MINUTES) {
      resultat.push({ jour, heureDebut: versHHMM(curseur), heureFin: versHHMM(FERMETURE_MINUTES) });
    }
  }

  return resultat.filter((f) => f.heureDebut < f.heureFin);
}
