import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NIVEAUX,
  NIVEAU_SUIVANT,
  anneeAcademiqueSuivante,
  anneesAcademiques,
} from "./referentiel-options";

describe("anneesAcademiques", () => {
  afterEach(() => vi.useRealTimers());

  it("bascule en août, pas en janvier", () => {
    // L'année universitaire commence en août. En juillet 2026 on est encore
    // dans 2025-2026 ; en août on passe à 2026-2027. Une liste écrite en dur
    // deviendrait fausse en silence à la rentrée, et personne ne s'en
    // apercevrait avant de ne plus pouvoir créer la nouvelle promotion.
    expect(anneesAcademiques(new Date(2026, 6, 31))).toEqual(["2024-2025", "2025-2026", "2026-2027"]);
    expect(anneesAcademiques(new Date(2026, 7, 1))).toEqual(["2025-2026", "2026-2027", "2027-2028"]);
  });

  it("propose la précédente, la courante et la suivante", () => {
    const annees = anneesAcademiques(new Date(2026, 8, 21));
    expect(annees).toHaveLength(3);
    expect(annees[1]).toBe("2026-2027");
  });

  it("utilise la date du jour par défaut", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21));
    expect(anneesAcademiques()[1]).toBe("2026-2027");
  });
});

describe("anneeAcademiqueSuivante", () => {
  it("incrémente les deux bornes", () => {
    expect(anneeAcademiqueSuivante("2026-2027")).toBe("2027-2028");
  });

  it("franchit un changement de siècle", () => {
    expect(anneeAcademiqueSuivante("2099-2100")).toBe("2100-2101");
  });
});

describe("cycle LMD", () => {
  it("propose les cinq niveaux", () => {
    expect([...NIVEAUX]).toEqual(["L1", "L2", "L3", "M1", "M2"]);
  });

  it("enchaîne les niveaux de passage", () => {
    expect(NIVEAU_SUIVANT.L1).toBe("L2");
    expect(NIVEAU_SUIVANT.L2).toBe("L3");
    expect(NIVEAU_SUIVANT.M1).toBe("M2");
  });

  it("n'a pas de suite pour les fins de cycle", () => {
    // L3 et M2 débouchent sur un diplôme, pas sur un passage : il n'existe
    // pas de "L4". C'est là que s'arrête la promotion automatique.
    expect(NIVEAU_SUIVANT.L3).toBeUndefined();
    expect(NIVEAU_SUIVANT.M2).toBeUndefined();
  });
});
