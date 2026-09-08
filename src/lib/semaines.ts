/**
 * [V3] FR-EDT-09 — manipulation des semaines calendaires.
 *
 * Tout est calculé en heure LOCALE et sérialisé en "AAAA-MM-JJ" à la main.
 * `toISOString()` convertit en UTC et décale la date d'un jour pour tout
 * fuseau à l'est de Greenwich — un lundi soir deviendrait un dimanche, et la
 * semaine affichée ne serait pas celle demandée.
 */
export const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;

export function versIso(date: Date): string {
  const mois = `${date.getMonth() + 1}`.padStart(2, "0");
  const jour = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export function depuisIso(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}

export function lundiDe(date: Date): Date {
  const copie = new Date(date);
  // getDay() : 0 = dimanche. On ramène toujours au lundi précédent.
  const decalage = (copie.getDay() + 6) % 7;
  copie.setDate(copie.getDate() - decalage);
  return copie;
}

export function ajouterJours(date: Date, jours: number): Date {
  const copie = new Date(date);
  copie.setDate(copie.getDate() + jours);
  return copie;
}

export function datesDeLaSemaine(lundiIso: string): string[] {
  const lundi = depuisIso(lundiIso);
  return JOURS_SEMAINE.map((_, i) => versIso(ajouterJours(lundi, i)));
}

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const FORMAT_COURT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function libelleSemaine(lundiIso: string, samediIso: string): string {
  return `Semaine du ${FORMAT_JOUR.format(depuisIso(lundiIso))} au ${FORMAT_JOUR.format(depuisIso(samediIso))}`;
}

export function libelleDateCourte(iso: string): string {
  return FORMAT_COURT.format(depuisIso(iso));
}

export function estAujourdhui(iso: string): boolean {
  return iso === versIso(new Date());
}
