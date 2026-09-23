import { describe, expect, it } from "vitest";
import { detecterConflits } from "./conflict-detection";
import type { Creneau } from "./types";

/**
 * Moteur de conflits côté écran. Ce module est un décalque de
 * `conflict_engine/services.py`, qui fait foi : ces tests verrouillent
 * l'équivalence. Un écart ici annonce au Gestionnaire un conflit que le
 * serveur accepte (ou l'inverse), et plus personne ne sait lequel croire.
 */

let compteur = 0;

function creneau(partiel: Partial<Creneau> & { date?: string } = {}): Creneau {
  compteur += 1;
  return {
    id: `c${compteur}`,
    date: "2026-09-21",
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "10:00",
    statut: "normal",
    version: 1,
    ue: { id: "ue1", code: "UE1", intitule: "Algorithmique", ufrId: "ufr", departements: [] },
    enseignant: { id: "ens1", nom: "Kaboré", prenom: "Ismaël" },
    salle: { id: "salle1", nom: "Amphi A", capacite: 200, typeUsage: "cours" },
    groupe: {
      id: "grp1",
      nom: "L2 MPCI",
      departement: "MPCI",
      niveau: "L2",
      anneeAcademique: "2026-2027",
      ufrId: "ufr",
      effectif: 50,
      aDejaEteSuccede: false,
    },
    ...partiel,
  } as Creneau;
}

const types = (creneaux: Creneau[]) => detecterConflits(creneaux).map((c) => c.type).sort();

describe("chevauchement dans le temps", () => {
  it("signale deux créneaux qui se recouvrent le même jour", () => {
    const a = creneau({ heureDebut: "08:00", heureFin: "10:00" });
    const b = creneau({ heureDebut: "09:00", heureFin: "11:00" });
    expect(types([a, b])).toContain("salle");
  });

  it("ne signale rien quand l'un finit où l'autre commence", () => {
    const a = creneau({ heureDebut: "08:00", heureFin: "10:00" });
    const b = creneau({ heureDebut: "10:00", heureFin: "12:00" });
    expect(detecterConflits([a, b])).toHaveLength(0);
  });

  it("ne signale rien pour un même jour de la semaine à des DATES différentes", () => {
    // Régression : la comparaison portait sur `jour` ("lundi"), libellé
    // partagé par toutes les semaines — deux cours à une semaine d'écart
    // entraient donc en conflit. Le blocage se produisait à la saisie de la
    // semaine suivante, sans que rien n'explique pourquoi.
    const a = creneau({ date: "2026-09-21", jour: "lundi" });
    const b = creneau({ date: "2026-09-28", jour: "lundi" });
    expect(detecterConflits([a, b])).toHaveLength(0);
  });
});

describe("types de conflits", () => {
  it("détecte une double réservation de salle", () => {
    const a = creneau({ salle: { id: "s1", nom: "Amphi A", capacite: 200, typeUsage: "cours" } });
    const b = creneau({
      salle: { id: "s1", nom: "Amphi A", capacite: 200, typeUsage: "cours" },
      enseignant: { id: "ens2", nom: "Ouédraogo", prenom: "Awa" },
      groupe: { ...creneau().groupe, id: "grp2" },
    });
    const conflits = detecterConflits([a, b]);
    expect(conflits.map((c) => c.type)).toEqual(["salle"]);
    expect(conflits[0].gravite).toBe("bloquant");
  });

  it("détecte un enseignant affecté à deux cours simultanés", () => {
    const a = creneau({ salle: { id: "s1", nom: "A", capacite: 200, typeUsage: "cours" } });
    const b = creneau({
      salle: { id: "s2", nom: "B", capacite: 200, typeUsage: "cours" },
      groupe: { ...creneau().groupe, id: "grp2" },
    });
    expect(types([a, b])).toEqual(["enseignant"]);
  });

  it("détecte une promotion à deux cours en même temps", () => {
    const a = creneau({ salle: { id: "s1", nom: "A", capacite: 200, typeUsage: "cours" } });
    const b = creneau({
      salle: { id: "s2", nom: "B", capacite: 200, typeUsage: "cours" },
      enseignant: { id: "ens2", nom: "Ouédraogo", prenom: "Awa" },
    });
    expect(types([a, b])).toEqual(["groupe"]);
  });

  it("avertit quand l'effectif dépasse la capacité de la salle", () => {
    const c = creneau({
      groupe: { ...creneau().groupe, effectif: 300 },
      salle: { id: "s1", nom: "Petite salle", capacite: 40, typeUsage: "cours" },
    });
    const conflits = detecterConflits([c]);
    expect(conflits.map((x) => x.type)).toEqual(["capacite"]);
    // Avertissement et non blocage : la salle reste utilisable, c'est au
    // Gestionnaire de juger.
    expect(conflits[0].gravite).toBe("avertissement");
  });

  it("ne signale pas de capacité quand la salle suffit", () => {
    expect(detecterConflits([creneau({ groupe: { ...creneau().groupe, effectif: 50 } })])).toHaveLength(0);
  });
});

describe("séance annulée", () => {
  it("libère salle, enseignant et promotion", () => {
    // Reprogrammer un cours à la place d'une séance annulée est le geste le
    // plus naturel après une annulation : il ne doit jamais réclamer de
    // motif de dérogation.
    const annule = creneau({ statut: "annule", motif: "Enseignant absent" });
    const remplacant = creneau();
    expect(detecterConflits([annule, remplacant])).toHaveLength(0);
  });

  it("ne déclenche pas d'alerte de capacité", () => {
    const annule = creneau({
      statut: "annule",
      motif: "Salle indisponible",
      groupe: { ...creneau().groupe, effectif: 300 },
      salle: { id: "s1", nom: "Petite salle", capacite: 40, typeUsage: "cours" },
    });
    expect(detecterConflits([annule])).toHaveLength(0);
  });
});

describe("spécialités au sein d'une même promotion", () => {
  // Décalque de `_memes_etudiants` côté serveur : deux spécialités
  // différentes d'une même promotion sont des sous-populations disjointes.
  // C'est le cas normal d'une L2 de portail où Maths et Chimie tombent à la
  // même heure — l'annoncer comme un conflit rendrait la saisie impossible.
  // Salle et enseignant DISTINCTS à chaque appel : on isole ainsi le conflit
  // de groupe, seul objet de ces cas, sans qu'une double réservation de
  // salle ou d'enseignant vienne s'y mêler.
  let n = 0;
  const memeCreneauAutreCours = (specialite?: string) => {
    n += 1;
    return creneau({
      specialite,
      salle: { id: `s-${n}`, nom: `Salle ${n}`, capacite: 200, typeUsage: "cours" },
      enseignant: { id: `e-${n}`, nom: `Nom${n}`, prenom: "P" },
    } as Partial<Creneau>);
  };

  it("deux spécialités différentes ne sont PAS en conflit", () => {
    expect(detecterConflits([memeCreneauAutreCours("Mathématiques"), memeCreneauAutreCours("Chimie")])).toHaveLength(0);
  });

  it("la même spécialité est en conflit, quelle que soit la casse", () => {
    expect(types([memeCreneauAutreCours("Mathématiques"), memeCreneauAutreCours("MATHÉMATIQUES")])).toEqual(["groupe"]);
  });

  it("un cours commun (sans spécialité) entre en conflit avec une spécialité", () => {
    // Le tronc commun concerne aussi les étudiants de la spécialité : ils ne
    // peuvent pas être aux deux endroits.
    expect(types([memeCreneauAutreCours(undefined), memeCreneauAutreCours("Physique")])).toEqual(["groupe"]);
  });

  it("deux cours sans spécialité concernent toute la promotion : conflit", () => {
    expect(types([memeCreneauAutreCours(undefined), memeCreneauAutreCours(undefined)])).toEqual(["groupe"]);
  });

  it("la spécialité ne dispense pas du conflit de salle", () => {
    // Deux spécialités disjointes peuvent cohabiter dans l'emploi du temps,
    // jamais dans la même salle au même moment.
    const a = creneau({ specialite: "Mathématiques" } as Partial<Creneau>);
    const b = creneau({
      specialite: "Chimie",
      enseignant: { id: "ens2", nom: "Ouédraogo", prenom: "Awa" },
    } as Partial<Creneau>);
    expect(types([a, b])).toEqual(["salle"]);
  });
});
