import { afterEach, describe, expect, it, vi } from "vitest";
import { ajouterJours, datesDeLaSemaine, depuisIso, estAujourdhui, lundiDe, versIso } from "./semaines";

/**
 * Tout est calculé en heure LOCALE. Ces tests verrouillent surtout ça :
 * `toISOString()` convertirait en UTC et décalerait la date d'un jour pour
 * tout fuseau à l'est de Greenwich — un lundi soir deviendrait un dimanche,
 * et la semaine affichée ne serait pas celle demandée.
 */
describe("versIso / depuisIso", () => {
  it("sérialise en heure locale, sans décalage UTC", () => {
    // 23h00 locale : c'est exactement l'heure où une conversion UTC ferait
    // basculer la date au lendemain (ou la veille selon le fuseau).
    expect(versIso(new Date(2026, 8, 21, 23, 0, 0))).toBe("2026-09-21");
    expect(versIso(new Date(2026, 8, 21, 0, 30, 0))).toBe("2026-09-21");
  });

  it("complète mois et jour sur deux chiffres", () => {
    expect(versIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("fait l'aller-retour sans perte", () => {
    expect(versIso(depuisIso("2026-02-28"))).toBe("2026-02-28");
  });

  it("interprète la chaîne en heure locale, pas en UTC", () => {
    const d = depuisIso("2026-09-21");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(21);
  });
});

describe("lundiDe", () => {
  it("renvoie le jour même quand c'est déjà un lundi", () => {
    expect(versIso(lundiDe(new Date(2026, 8, 21)))).toBe("2026-09-21");
  });

  it("remonte au lundi depuis un jour de semaine", () => {
    expect(versIso(lundiDe(new Date(2026, 8, 24)))).toBe("2026-09-21");
  });

  it("remonte au lundi PRÉCÉDENT depuis un dimanche", () => {
    // Le piège classique : getDay() vaut 0 le dimanche. Sans le décalage
    // (getDay() + 6) % 7, un dimanche renverrait le lundi suivant et
    // l'écran afficherait la semaine d'après.
    expect(versIso(lundiDe(new Date(2026, 8, 27)))).toBe("2026-09-21");
  });

  it("ne modifie pas la date reçue", () => {
    const origine = new Date(2026, 8, 24);
    lundiDe(origine);
    expect(versIso(origine)).toBe("2026-09-24");
  });
});

describe("ajouterJours", () => {
  it("franchit un changement de mois", () => {
    expect(versIso(ajouterJours(new Date(2026, 8, 30), 2))).toBe("2026-10-02");
  });

  it("franchit un changement d'année", () => {
    expect(versIso(ajouterJours(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
  });

  it("gère une année bissextile", () => {
    expect(versIso(ajouterJours(new Date(2028, 1, 28), 1))).toBe("2028-02-29");
  });

  it("ne modifie pas la date reçue", () => {
    const origine = new Date(2026, 8, 21);
    ajouterJours(origine, 5);
    expect(versIso(origine)).toBe("2026-09-21");
  });
});

describe("datesDeLaSemaine", () => {
  it("donne les six jours du lundi au samedi", () => {
    // Six et non sept : le dimanche n'est pas un jour ouvré à l'UJKZ.
    expect(datesDeLaSemaine("2026-09-21")).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
  });

  it("franchit un changement de mois", () => {
    expect(datesDeLaSemaine("2026-09-28")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });
});

describe("estAujourdhui", () => {
  afterEach(() => vi.useRealTimers());

  it("reconnaît la date du jour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 14, 30));
    expect(estAujourdhui("2026-09-21")).toBe(true);
    expect(estAujourdhui("2026-09-22")).toBe(false);
  });

  it("reste vrai tard le soir, malgré la bascule UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 23, 59));
    expect(estAujourdhui("2026-09-21")).toBe(true);
  });
});
