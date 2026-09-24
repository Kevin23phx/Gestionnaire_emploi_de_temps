import { describe, expect, it } from "vitest";
import { correspond, valeursDistinctes } from "./filtres";
import { normaliser } from "./recherche";

describe("normaliser", () => {
  it("ignore les accents", () => {
    // Une recherche doit trouver « Réseaux » tapée « reseaux » : clavier
    // sans accents, saisie rapide.
    expect(normaliser("Réseaux")).toBe("reseaux");
    expect(normaliser("Mathématiques")).toBe("mathematiques");
    expect(normaliser("ÉCOLE")).toBe("ecole");
  });

  it("ignore la casse", () => {
    expect(normaliser("InFoRmAtIqUe")).toBe("informatique");
  });

  it("ramène la cédille à un c simple", () => {
    // La décomposition NFD sépare « ç » en « c » + cédille combinante, que
    // le filtre retire ensuite. Conséquence heureuse : « francais » trouve
    // « Français », ce qui est exactement ce qu'on veut d'un clavier sans
    // accents.
    expect(normaliser("Français")).toBe("francais");
    expect(correspond("francais", "Cours de Français")).toBe(true);
  });
});

describe("correspond", () => {
  it("accepte tout quand la recherche est vide", () => {
    expect(correspond("", "Algorithmique")).toBe(true);
    expect(correspond("   ", "Algorithmique")).toBe(true);
  });

  it("trouve sans tenir compte des accents ni de la casse", () => {
    expect(correspond("reseaux", "Réseaux avancés")).toBe(true);
    expect(correspond("RESEAUX", "Réseaux avancés")).toBe(true);
  });

  it("cherche une sous-chaîne, pas un mot entier", () => {
    expect(correspond("algo", "Algorithmique")).toBe(true);
  });

  it("cherche dans plusieurs champs à la fois", () => {
    expect(correspond("mpci", "L2 Groupe A", "MPCI")).toBe(true);
  });

  it("ignore les champs vides ou absents", () => {
    expect(correspond("info", null, undefined, "Informatique")).toBe(true);
    expect(correspond("info", null, undefined)).toBe(false);
  });

  it("rejette ce qui ne correspond pas", () => {
    expect(correspond("chimie", "Algorithmique", "MPCI")).toBe(false);
  });

  it("ignore les espaces autour du terme cherché", () => {
    expect(correspond("  algo  ", "Algorithmique")).toBe(true);
  });
});

describe("valeursDistinctes", () => {
  const items = [
    { nom: "Chimie" },
    { nom: "Algèbre" },
    { nom: "Chimie" },
    { nom: "" },
    { nom: "Physique" },
  ];

  it("dédoublonne et trie selon l'ordre français", () => {
    expect(valeursDistinctes(items, (i) => i.nom)).toEqual(["Algèbre", "Chimie", "Physique"]);
  });

  it("écarte les valeurs vides", () => {
    // Un menu de filtre ne doit pas proposer d'entrée vide : elle ne
    // filtrerait rien et ressemblerait à une donnée manquante.
    expect(valeursDistinctes(items, (i) => i.nom)).not.toContain("");
  });

  it("trie les accents à leur place alphabétique", () => {
    // localeCompare("fr") : « Éducation » se range entre « Droit » et
    // « Lettres », pas rejeté en fin de liste comme le ferait un tri brut
    // sur les codes de caractères.
    const tries = valeursDistinctes([{ n: "Lettres" }, { n: "Éducation" }, { n: "Droit" }], (i) => i.n);
    expect(tries).toEqual(["Droit", "Éducation", "Lettres"]);
  });

  it("renvoie une liste vide pour une entrée vide", () => {
    expect(valeursDistinctes([], (i: { nom: string }) => i.nom)).toEqual([]);
  });
});
