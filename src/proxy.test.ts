import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "./proxy";
import { CHEMIN_ESPACE_ADMIN, CHEMIN_INTERNE_ADMIN, EN_TETE_ESPACE_ADMIN } from "./lib/espace-admin";

/**
 * Masquage de l'espace Admin. Ce n'est pas un contrôle d'accès — le vrai
 * verrou est le RBAC du backend — mais c'est une règle de sécurité, et
 * elle tient à un détail : l'en-tête marqueur doit être posé par CE fichier
 * et par lui seul. Un client qui l'enverrait lui-même ne doit rien obtenir.
 */
function requete(chemin: string, entetes: Record<string, string> = {}) {
  return new NextRequest(`https://exemple.test${chemin}`, { headers: new Headers(entetes) });
}

const enteteTransmise = (reponse: Response) =>
  reponse.headers.get("x-middleware-override-headers")?.includes(EN_TETE_ESPACE_ADMIN);

describe("chemin non annoncé", () => {
  it("réécrit vers les pages réelles sans changer l'URL affichée", () => {
    // Réécriture et non redirection : une redirection ferait apparaître
    // /admin dans la barre d'adresse et annulerait tout l'exercice.
    const reponse = proxy(requete(CHEMIN_ESPACE_ADMIN));
    const destination = reponse.headers.get("x-middleware-rewrite");
    expect(destination).toContain(CHEMIN_INTERNE_ADMIN);
    expect(reponse.status).not.toBe(307);
    expect(reponse.status).not.toBe(308);
  });

  it("conserve le sous-chemin demandé", () => {
    const reponse = proxy(requete(`${CHEMIN_ESPACE_ADMIN}/audit`));
    expect(reponse.headers.get("x-middleware-rewrite")).toContain(`${CHEMIN_INTERNE_ADMIN}/audit`);
  });

  it("pose le marqueur qui autorise le layout à servir la page", () => {
    expect(enteteTransmise(proxy(requete(CHEMIN_ESPACE_ADMIN)))).toBe(true);
  });
});

describe("accès direct à /admin", () => {
  it("ne réécrit rien", () => {
    // C'est le layout qui répondra 404, faute de marqueur : rien ne
    // distingue alors « cette section n'existe pas » de « elle existe mais
    // pas pour vous ».
    expect(proxy(requete(CHEMIN_INTERNE_ADMIN)).headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("SUPPRIME un marqueur envoyé par le client", () => {
    // Le cœur de la règle : sans cette suppression, il suffirait d'ajouter
    // un en-tête à la main pour ouvrir l'espace Admin par son vrai chemin.
    const reponse = proxy(requete(CHEMIN_INTERNE_ADMIN, { [EN_TETE_ESPACE_ADMIN]: "1" }));
    const surcharge = reponse.headers.get("x-middleware-override-headers") ?? "";
    expect(surcharge.includes(EN_TETE_ESPACE_ADMIN)).toBe(false);
  });

  it("supprime aussi le marqueur sur un sous-chemin", () => {
    const reponse = proxy(requete(`${CHEMIN_INTERNE_ADMIN}/audit`, { [EN_TETE_ESPACE_ADMIN]: "1" }));
    expect(reponse.headers.get("x-middleware-override-headers") ?? "").not.toContain(EN_TETE_ESPACE_ADMIN);
  });
});

describe("chemins ordinaires", () => {
  it("laisse passer sans réécriture ni marqueur", () => {
    for (const chemin of ["/", "/connexion", "/scolarite/planning", "/programme/abc"]) {
      const reponse = proxy(requete(chemin));
      expect(reponse.headers.get("x-middleware-rewrite")).toBeNull();
      expect(enteteTransmise(reponse)).toBeFalsy();
    }
  });
});

describe("matcher", () => {
  // Ancré, comme le fait Next.js : le motif décrit le chemin ENTIER. Sans
  // les ancres, « /api/... » passerait le test en trouvant une
  // correspondance ailleurs dans la chaîne, et on croirait à tort que
  // l'API est concernée.
  const concerne = (chemin: string) => new RegExp(`^${config.matcher[0]}$`).test(chemin);

  it("laisse l'API hors du proxy", () => {
    // Le relais /api vers Render ne doit surtout pas passer par ici : c'est
    // lui qui porte la session, et toute réécriture le casserait.
    expect(concerne("/api/public/annees")).toBe(false);
  });

  it("laisse les fichiers statiques hors du proxy", () => {
    expect(concerne("/_next/static/chunk.js")).toBe(false);
    expect(concerne("/favicon.ico")).toBe(false);
    expect(concerne("/icon.png")).toBe(false);
    expect(concerne("/sw.js")).toBe(false);
  });

  it("couvre les pages de l'application", () => {
    expect(concerne("/")).toBe(true);
    expect(concerne(CHEMIN_ESPACE_ADMIN)).toBe(true);
    expect(concerne(CHEMIN_INTERNE_ADMIN)).toBe(true);
  });
});
