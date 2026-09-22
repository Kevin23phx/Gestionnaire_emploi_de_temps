"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Departement, Specialite } from "@/lib/types";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";
import { NIVEAUX } from "@/lib/referentiel-options";

// [V8, 2026-09-21] Réforme « Niveau / Spécialité » — FR-REF-33/34/35.
//
// C'est ICI que le Gestionnaire déclare les spécialités, et nulle part
// ailleurs : l'Admin n'a aucun moyen de savoir qu'une licence de portail se
// scinde à partir de la L2 ; le Gestionnaire de l'établissement, si.
//
// ## Pourquoi l'écran est bâti autour d'UN couple à la fois
//
// Première version (2026-09-21, refaite le jour même après retour du
// porteur de projet : « je ne comprends pas vraiment l'écran ») : deux
// blocs séparés, l'un pour créer, l'autre pour consulter, chacun avec sa
// propre liste déroulante « Département ». Deux sélecteurs pour la même
// notion sur le même écran — on pouvait consulter la L2 de MPCI tout en
// ajoutant en L3 de Chimie, sans que rien ne le signale. La souplesse
// théorique se payait en confusion immédiate, et elle rendait surtout
// invisible ce que la réforme a de central : une spécialité appartient à un
// COUPLE (département, niveau), pas à un département.
//
// L'écran ne pose donc plus qu'une question, une seule fois : « de quel
// département et de quel niveau parle-t-on ? ». Tout le reste — la liste,
// le compteur, le champ d'ajout, la suppression — vit dans ce cadre et le
// répète en toutes lettres (« Spécialités de MPCI en L2 »). La liste qu'on
// voit est exactement celle qu'on complète.
//
// ## Pourquoi pas de bouton « Actualiser » ici
//
// Le reste du référentiel gestionnaire ne charge rien avant un clic
// explicite (écran Départements, Promotions...) : c'est une mesure de
// sobriété réseau, motivée par des listes de plusieurs dizaines d'entrées
// tirées en entier. Ici la requête est bornée à un seul couple — quelques
// lignes — et le choix du couple EST déjà le geste explicite. Ajouter un
// bouton aurait fait une étape de plus pour le même octet transféré.
export default function SpecialitesPage() {
  const [departements, setDepartements] = useState<Departement[] | null>(null);
  const [departementId, setDepartementId] = useState("");
  const [niveau, setNiveau] = useState("");

  // Les spécialités chargées, ÉTIQUETÉES du couple pour lequel elles l'ont
  // été. Sans cette étiquette, une réponse lente pour la L2 s'afficherait
  // comme étant celle de la L3 sélectionnée entre-temps — et sous un titre
  // qui, lui, dirait « L3 ».
  const [chargees, setChargees] = useState<{ cle: string; liste: Specialite[] } | null>(null);

  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  // Compte rendu du dernier ajout — distinct de `erreur` : « 2 ajoutées,
  // « Chimie » existait déjà » n'est pas un échec, c'est un succès partiel
  // qu'il faut pourtant dire.
  //
  // Étiqueté du couple auquel il se rapporte, et affiché seulement si
  // c'est celui qu'on regarde : sinon un compte rendu resterait à l'écran
  // après un changement de département et se lirait comme s'il concernait
  // le nouveau. Étiqueter plutôt que remettre à zéro dans un effet — un
  // setState en corps d'effet relance un rendu en cascade.
  const [message, setMessage] = useState<{ cle: string; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const coupleChoisi = Boolean(departementId && niveau);
  const libelleDepartement = (departements ?? []).find((d) => d.id === departementId)?.libelle ?? "";

  // Identifiant du couple courant, et liste DÉRIVÉE de lui : `null` tant
  // que la réponse de CE couple n'est pas arrivée. Calculée plutôt que
  // posée dans un effet — un `setState` en corps d'effet relance un rendu
  // en cascade, et surtout il fait exister un instant où l'écran montre la
  // liste du couple précédent sous le titre du nouveau.
  const cle = coupleChoisi ? `${departementId}|${niveau}` : "";
  const specialites: Specialite[] | null = cle && chargees?.cle === cle ? chargees.liste : null;
  const chargement = Boolean(cle) && specialites === null;

  useEffect(() => {
    let annule = false;
    apiFetch("/departements")
      .then(lireReponse<{ departements: Departement[] }>)
      .then((data) => {
        if (!annule) setDepartements(data.departements ?? []);
      })
      .catch(() => {
        if (!annule) setDepartements([]);
      });
    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    if (!cle) return;
    let annule = false;
    const params = new URLSearchParams({ departementId, niveau });
    apiFetch(`/specialites?${params.toString()}`)
      .then((reponse) => lireReponse<{ specialites?: Specialite[] }>(reponse))
      .then((data) => {
        if (!annule) setChargees({ cle, liste: data.specialites ?? [] });
      })
      .catch(() => {
        // Coupure réseau : liste vide plutôt qu'un écran bloqué sur
        // « Chargement... » indéfiniment. C'est ce chemin d'erreur non
        // traité qui figeait la première version de l'écran (cf.
        // `lireReponse` dans src/lib/api.ts).
        if (!annule) setChargees({ cle, liste: [] });
      });
    return () => {
      annule = true;
    };
  }, [cle, departementId, niveau]);

  /** Remplace la liste du couple COURANT, jamais celle d'un autre. */
  function majListe(transformer: (liste: Specialite[]) => Specialite[]) {
    setChargees((actuelles) =>
      actuelles && actuelles.cle === cle ? { cle, liste: transformer(actuelles.liste) } : actuelles
    );
  }

  async function creer() {
    const libelle = nouveau.trim();
    if (!libelle || !coupleChoisi) return;
    setErreur(null);
    setMessage(null);
    setEnCours(true);
    try {
      // La chaîne part telle quelle : c'est le SERVEUR qui la découpe (cf.
      // `decouper_libelles`). Découper ici aussi ferait exister deux
      // règles pour une seule question, et elles divergeraient le jour où
      // l'une des deux évolue.
      const reponse = await apiFetch("/specialites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle, departementId, niveau }),
      });
      const data = await lireReponse<{
        erreur?: string;
        specialites?: Specialite[];
        doublons?: string[];
      }>(reponse);
      if (!reponse.ok) {
        setErreur(messageErreur(reponse, data, "Impossible de créer la spécialité."));
        return;
      }
      setNouveau("");
      // Ajoutées localement plutôt que rechargées : la réponse contient
      // déjà les spécialités créées, et les insérer directement évite
      // l'aller-retour pendant lequel la liste paraîtrait n'avoir rien
      // enregistré.
      const creees = data.specialites ?? [];
      majListe((liste) =>
        [...liste, ...creees].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"))
      );

      // Compte rendu explicite. Sans lui, une saisie de trois spécialités
      // dont une existait déjà ferait apparaître deux lignes, et le
      // Gestionnaire chercherait ce qu'il a mal tapé.
      const doublons = data.doublons ?? [];
      const ajoutees = `${creees.length} spécialité${creees.length > 1 ? "s" : ""} ajoutée${creees.length > 1 ? "s" : ""}`;
      setMessage({
        cle,
        texte:
          doublons.length > 0
            ? `${ajoutees} — ${doublons.map((d) => `« ${d} »`).join(", ")} ${doublons.length > 1 ? "existaient" : "existait"} déjà.`
            : `${ajoutees}.`,
      });
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer(specialite: Specialite) {
    const confirme = window.confirm(
      `Supprimer la spécialité « ${specialite.libelle} » (${specialite.niveau}) ?\n\n` +
        "Les groupes qui la portent déjà ne sont pas modifiés : leur programme reste publié sous ce nom."
    );
    if (!confirme) return;
    setErreur(null);
    try {
      const reponse = await apiFetch(`/specialites/${specialite.id}`, { method: "DELETE" });
      if (!reponse.ok) {
        const data = await lireReponse<{ erreur?: string }>(reponse);
        setErreur(messageErreur(reponse, data, "Impossible de supprimer cette spécialité."));
        return;
      }
      majListe((liste) => liste.filter((s) => s.id !== specialite.id));
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    }
  }

  const nombre = specialites?.length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Spécialités</h1>
        <p className="text-sm text-text-muted">
          Les choix qu&apos;un département ouvre à un niveau donné — par exemple Mathématiques, Physique,
          Chimie et Informatique proposés en L2 à un département qui était un tronc commun en L1.
        </p>
      </div>

      {/* ÉTAPE 1 — le cadre. Une seule fois, pour tout l'écran. */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-semibold text-text">
          1. De quel département et de quel niveau parlons-nous ?
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-[2] flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Département</span>
            <select
              value={departementId}
              onChange={(e) => setDepartementId(e.target.value)}
              disabled={departements === null}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
            >
              <option value="">{departements === null ? "Chargement..." : "Choisir..."}</option>
              {(departements ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.libelle}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[140px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-text-muted">Niveau</span>
            <select
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            >
              <option value="">Choisir...</option>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-text-subtle">
          Le niveau fait partie de l&apos;identité d&apos;une spécialité : « Informatique » en L2 et
          « Informatique » en L3 sont deux choix distincts, offerts à deux promotions différentes. C&apos;est
          ce qui permet à un département d&apos;être un tronc commun en L1 et de se scinder en L2.
        </p>
      </div>

      {erreur ? (
        <p className="mb-4 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
      ) : null}
      {message && message.cle === cle ? (
        <p className="mb-4 rounded-lg bg-status-success-bg px-3 py-2 text-sm text-status-success">
          {message.texte}
        </p>
      ) : null}

      {!coupleChoisi ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Choisissez un département <strong>et</strong> un niveau ci-dessus. Les spécialités de ce niveau
          s&apos;afficheront ici, et vous pourrez en ajouter.
        </div>
      ) : (
        /* ÉTAPE 2 — la liste du couple choisi, et le champ qui la complète. */
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text">
              Spécialités de « {libelleDepartement} » en {niveau}
            </h2>
            <span className="text-xs text-text-subtle">
              {chargement ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Chargement...
                </span>
              ) : (
                `${nombre} déclarée${nombre > 1 ? "s" : ""}`
              )}
            </span>
          </div>

          {!chargement && nombre === 0 ? (
            // Pas une erreur, et c'est le point le plus important de
            // l'écran : une liste vide est un état VALIDE, qui veut dire
            // « tronc commun ». Le dire ici évite que le Gestionnaire
            // invente une spécialité bidon pour « remplir » le niveau.
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              Aucune spécialité en {niveau} pour ce département.
              <br />
              <span className="text-text-subtle">
                C&apos;est un état normal : ce niveau sera traité comme un <strong>tronc commun</strong> et
                l&apos;étudiant n&apos;aura aucun choix à faire. N&apos;ajoutez une spécialité que si le choix
                existe réellement.
              </span>
            </p>
          ) : (
            <ul>
              {(specialites ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <span className="min-w-0 truncate text-sm font-medium text-text">{s.libelle}</span>
                  <button
                    onClick={() => supprimer(s)}
                    aria-label={`Supprimer ${s.libelle}`}
                    className="shrink-0 rounded-lg p-1.5 text-text-subtle hover:bg-status-danger-bg hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2 px-4 py-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">
                Ajouter une ou plusieurs spécialités en {niveau}
              </span>
              <input
                type="text"
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
                // Entrée pour valider : on en ajoute plusieurs à la suite,
                // et forcer le passage par la souris entre chaque serait
                // pénible pour rien.
                onKeyDown={(e) => {
                  if (e.key === "Enter") creer();
                }}
                // [V8.1] Le placeholder MONTRE la virgule plutôt que de la
                // décrire : c'est ainsi qu'un Gestionnaire énumère
                // spontanément, et la première version enregistrait toute
                // la phrase comme un seul libellé.
                placeholder="ex : Médecine générale, Sciences du cerveau, Sciences des membres"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <button
              onClick={creer}
              disabled={enCours || !nouveau.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {enCours ? "Ajout..." : "Ajouter"}
            </button>
          </div>

          <p className="border-t border-border px-4 py-3 text-xs text-text-subtle">
            Séparez-les par des <strong>virgules</strong> pour en ajouter plusieurs d&apos;un coup : chacune
            devient une ligne distincte ci-dessus, et un choix distinct pour l&apos;étudiant. Ajoutez-en{" "}
            <strong>autant que le niveau en propose réellement</strong> — il n&apos;y a pas de limite. Beaucoup
            de départements n&apos;en ont aucune à aucun niveau, et c&apos;est très bien ainsi.
          </p>
        </div>
      )}
    </div>
  );
}
