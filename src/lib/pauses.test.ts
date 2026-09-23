import { describe, expect, it } from "vitest";
import { decouperSelonPauses } from "./pauses";

/**
 * Pauses fixes : 10:00-10:15, 12:00-13:00, 15:00-15:15.
 * Un créneau ne doit jamais englober une pause — la plage saisie est
 * scindée de part et d'autre.
 */
describe("decouperSelonPauses", () => {
  it("laisse intacte une plage qui ne touche aucune pause", () => {
    expect(decouperSelonPauses("08:00", "10:00")).toEqual([{ heureDebut: "08:00", heureFin: "10:00" }]);
  });

  it("scinde une plage qui enjambe la pause du matin", () => {
    expect(decouperSelonPauses("09:00", "11:00")).toEqual([
      { heureDebut: "09:00", heureFin: "10:00" },
      { heureDebut: "10:15", heureFin: "11:00" },
    ]);
  });

  it("scinde en trois une plage qui enjambe deux pauses", () => {
    expect(decouperSelonPauses("09:00", "14:00")).toEqual([
      { heureDebut: "09:00", heureFin: "10:00" },
      { heureDebut: "10:15", heureFin: "12:00" },
      { heureDebut: "13:00", heureFin: "14:00" },
    ]);
  });

  it("ne renvoie aucun segment pour une plage entièrement dans une pause", () => {
    // Le formulaire traite « aucun segment » comme « rien à enregistrer » :
    // pas de cas particulier à gérer côté appelant.
    expect(decouperSelonPauses("12:00", "13:00")).toEqual([]);
    expect(decouperSelonPauses("12:15", "12:45")).toEqual([]);
  });

  it("rogne une plage qui commence au milieu d'une pause", () => {
    expect(decouperSelonPauses("12:30", "14:00")).toEqual([{ heureDebut: "13:00", heureFin: "14:00" }]);
  });

  it("rogne une plage qui se termine au milieu d'une pause", () => {
    expect(decouperSelonPauses("11:00", "12:30")).toEqual([{ heureDebut: "11:00", heureFin: "12:00" }]);
  });

  it("ne scinde pas une plage qui s'arrête pile au début d'une pause", () => {
    expect(decouperSelonPauses("08:00", "12:00")).toEqual([
      { heureDebut: "08:00", heureFin: "10:00" },
      { heureDebut: "10:15", heureFin: "12:00" },
    ]);
  });

  it("couvre la journée entière en évitant les trois pauses", () => {
    expect(decouperSelonPauses("08:00", "18:00")).toEqual([
      { heureDebut: "08:00", heureFin: "10:00" },
      { heureDebut: "10:15", heureFin: "12:00" },
      { heureDebut: "13:00", heureFin: "15:00" },
      { heureDebut: "15:15", heureFin: "18:00" },
    ]);
  });
});
