import { describe, expect, it } from "vitest";
import { calculerFenetresLibres } from "./disponibilites";
import type { Creneau } from "./types";

/**
 * Fenêtres libres du planning propre d'un enseignant : ce qu'on peut lui
 * proposer comme destination de report. Journée 07:00-18:00, pauses fixes
 * déjà retirées. Proposer un horaire déjà pris créerait un conflit à coup
 * sûr — c'est précisément ce que ce calcul évite.
 */
function creneau(partiel: Partial<Creneau>): Creneau {
  return {
    id: "c1",
    date: "2026-09-21",
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "10:00",
    statut: "normal",
    version: 1,
    ue: { id: "ue1", code: "UE1", intitule: "Cours", ufrId: "ufr", departements: [] },
    enseignant: { id: "ens1", nom: "Kaboré", prenom: "Ismaël" },
    salle: { id: "s1", nom: "Amphi", capacite: 100, typeUsage: "cours" },
    groupe: {
      id: "g1",
      nom: "L2",
      departement: "MPCI",
      niveau: "L2",
      anneeAcademique: "2026-2027",
      ufrId: "ufr",
      effectif: 40,
      aDejaEteSuccede: false,
    },
    ...partiel,
  } as Creneau;
}

const duJour = (jour: string) => calculerFenetresLibres([]).filter((f) => f.jour === jour);
const lundi = (creneaux: Creneau[]) => calculerFenetresLibres(creneaux).filter((f) => f.jour === "lundi");

describe("agenda vide", () => {
  it("couvre les six jours ouvrés", () => {
    const jours = new Set(calculerFenetresLibres([]).map((f) => f.jour));
    expect([...jours]).toEqual(["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]);
  });

  it("découpe la journée autour des trois pauses fixes", () => {
    expect(duJour("lundi")).toEqual([
      { jour: "lundi", heureDebut: "07:00", heureFin: "10:00" },
      { jour: "lundi", heureDebut: "10:15", heureFin: "12:00" },
      { jour: "lundi", heureDebut: "13:00", heureFin: "15:00" },
      { jour: "lundi", heureDebut: "15:15", heureFin: "18:00" },
    ]);
  });
});

describe("créneaux occupés", () => {
  it("retire l'horaire d'un cours existant", () => {
    const fenetres = lundi([creneau({ heureDebut: "08:00", heureFin: "10:00" })]);
    expect(fenetres).toContainEqual({ jour: "lundi", heureDebut: "07:00", heureFin: "08:00" });
    expect(fenetres).not.toContainEqual(expect.objectContaining({ heureDebut: "07:00", heureFin: "10:00" }));
  });

  it("n'affecte que le jour concerné", () => {
    const fenetres = calculerFenetresLibres([creneau({ jour: "lundi", heureDebut: "07:00", heureFin: "10:00" })]);
    expect(fenetres.filter((f) => f.jour === "mardi")).toEqual(duJour("mardi"));
  });

  it("ne laisse aucune fenêtre de durée nulle", () => {
    // Un créneau qui épouse exactement une plage libre la fait disparaître,
    // au lieu de laisser une fenêtre 10:00-10:00 impossible à choisir.
    const fenetres = lundi([creneau({ heureDebut: "07:00", heureFin: "10:00" })]);
    expect(fenetres.every((f) => f.heureDebut < f.heureFin)).toBe(true);
    expect(fenetres).not.toContainEqual(expect.objectContaining({ heureDebut: "07:00", heureFin: "07:00" }));
  });

  it("fusionne un cours qui déborde sur une pause", () => {
    const fenetres = lundi([creneau({ heureDebut: "09:00", heureFin: "11:00" })]);
    expect(fenetres).toContainEqual({ jour: "lundi", heureDebut: "07:00", heureFin: "09:00" });
    expect(fenetres).toContainEqual({ jour: "lundi", heureDebut: "11:00", heureFin: "12:00" });
  });
});

describe("séance annulée", () => {
  it("rend l'enseignant de nouveau disponible", () => {
    // Un créneau annulé libère l'enseignant, exactement comme côté serveur :
    // c'est même l'horaire le plus probable pour un report.
    const annule = creneau({ heureDebut: "08:00", heureFin: "10:00", statut: "annule", motif: "Absent" });
    expect(lundi([annule])).toEqual(duJour("lundi"));
  });
});
