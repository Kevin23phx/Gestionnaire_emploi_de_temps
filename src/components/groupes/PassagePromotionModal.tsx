"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { Groupe, Specialite } from "@/lib/types";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";
import { NIVEAU_SUIVANT, anneeAcademiqueSuivante, specialitesDuCouple } from "@/lib/referentiel-options";

/**
 * [V6] FR-REF-12 — passage à l'année supérieure. Documenté depuis la V2
 * ("une promotion se fait en créant un nouveau Groupe, jamais en modifiant
 * celui-ci sur place") mais jamais implémenté : le Gestionnaire ressaisissait
 * chaque groupe de zéro à chaque rentrée.
 *
 * Reste une décision humaine, jamais automatique — comme un jury de fin
 * d'année : le Système propose le niveau suivant et préremplit l'effectif
 * avec la valeur actuelle, mais c'est au Gestionnaire de la corriger.
 * L'effectif diminue naturellement d'une année sur l'autre (abandons,
 * redoublements) et rien ne permet au Système de connaître le nouveau
 * chiffre à sa place — la ligne reste éditable, jamais appliquée en silence.
 *
 * Une case à décocher par ligne : la campagne ne doit pas forcer la main
 * sur un groupe pas encore prêt (résultats du jury pas encore délibérés,
 * par exemple).
 *
 * [V8, 2026-09-21] Une colonne « Spécialité » s'ajoute, et c'est le moment
 * du cursus où elle compte le plus : le passage d'année est précisément
 * celui où une cohorte de portail se spécialise. Une L1 MPCI sans
 * spécialité devient une L2 Mathématiques, Physique, Chimie ou
 * Informatique — le niveau cible commande donc la liste proposée, groupe
 * par groupe.
 *
 * LIMITE CONNUE, à trancher avec le porteur de projet : un groupe source ne
 * peut donner qu'UN groupe cible (`Groupe.promu_de` est un OneToOne, posé
 * en V6 pour qu'un double-clic ne crée pas deux L2 concurrents pour la même
 * cohorte). Une L1 MPCI qui se scinde en QUATRE L2 ne peut donc pas être
 * traitée entièrement ici : le Gestionnaire promeut vers la première
 * spécialité, puis crée les trois autres groupes par le formulaire de
 * création. Lever cette limite suppose de renoncer à la protection
 * anti-double-clic ou de la remplacer par autre chose — décision qui n'a
 * pas été prise.
 */

function suggererNom(nomActuel: string, niveauActuel: string, niveauCible: string): string {
  const motif = new RegExp(`\\b${niveauActuel}\\b`);
  return motif.test(nomActuel) ? nomActuel.replace(motif, niveauCible) : `${nomActuel} (${niveauCible})`;
}

function ligneDepuis(g: Groupe): Ligne {
  return {
    groupe: g,
    inclure: true,
    nom: suggererNom(g.nom, g.niveau, NIVEAU_SUIVANT[g.niveau]),
    effectif: String(g.effectif),
    specialite: "",
  };
}

interface Ligne {
  groupe: Groupe;
  inclure: boolean;
  nom: string;
  effectif: string;
  // [V8] Spécialité du groupe CIBLE. Jamais préremplie depuis le groupe
  // source : la spécialité du source (souvent aucune, en sortie de tronc
  // commun) n'a aucune raison d'exister au niveau suivant, et la reporter
  // en silence ferait valider un choix que personne n'a fait.
  specialite: string;
}

export function PassagePromotionModal({
  groupes,
  onClose,
  onPromu,
}: {
  groupes: Groupe[];
  onClose: () => void;
  onPromu: () => void;
}) {
  // Groupes qui PEUVENT être promus : niveau non terminal, pas déjà promus.
  const eligibles = useMemo(
    () => groupes.filter((g) => NIVEAU_SUIVANT[g.niveau] && !g.aDejaEteSuccede),
    [groupes]
  );
  const anneesDisponibles = useMemo(
    () => Array.from(new Set(eligibles.map((g) => g.anneeAcademique))).sort(),
    [eligibles]
  );

  const [anneeSource, setAnneeSource] = useState(anneesDisponibles.at(-1) ?? "");
  const anneeCible = anneeSource ? anneeAcademiqueSuivante(anneeSource) : "";

  const groupesDeLAnnee = useMemo(
    () => eligibles.filter((g) => g.anneeAcademique === anneeSource),
    [eligibles, anneeSource]
  );

  const [lignes, setLignes] = useState<Ligne[]>(() => groupesDeLAnnee.map(ligneDepuis));

  // [V8] Tout le référentiel des spécialités de l'établissement, en UNE
  // requête. Chaque ligne a son propre niveau cible (L1→L2, M1→M2...) :
  // interroger le serveur par ligne aurait multiplié les appels autant de
  // fois qu'il y a de groupes dans la campagne, pour un référentiel qui
  // tient de toute façon en quelques dizaines d'entrées.
  const [specialites, setSpecialites] = useState<Specialite[]>([]);
  useEffect(() => {
    let annule = false;
    apiFetch("/specialites")
      .then((r) => r.json())
      .then((data: { specialites: Specialite[] }) => {
        if (!annule) setSpecialites(data.specialites);
      })
      .catch(() => {
        // Sans le référentiel, la colonne reste vide : le passage doit
        // rester possible, quitte à renseigner la spécialité après coup.
      });
    return () => {
      annule = true;
    };
  }, []);

  function specialitesPour(groupe: Groupe): Specialite[] {
    const niveauCible = NIVEAU_SUIVANT[groupe.niveau];
    return specialitesDuCouple(specialites, groupe.departement, niveauCible);
  }

  function changerAnneeSource(annee: string) {
    setAnneeSource(annee);
    setLignes(eligibles.filter((g) => g.anneeAcademique === annee).map(ligneDepuis));
  }

  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const selectionnees = lignes.filter((l) => l.inclure);

  async function handleValider() {
    if (selectionnees.length === 0) {
      setErreur("Sélectionnez au moins un groupe.");
      return;
    }
    for (const ligne of selectionnees) {
      if (!ligne.nom.trim()) {
        setErreur(`Le nom du groupe issu de « ${ligne.groupe.nom} » est obligatoire.`);
        return;
      }
      const nombre = Number(ligne.effectif);
      if (!Number.isInteger(nombre) || nombre < 0) {
        setErreur(`L'effectif de « ${ligne.nom} » doit être un nombre entier positif.`);
        return;
      }
    }

    setErreur(null);
    setEnCours(true);
    // [V8] `try/finally` et `lireReponse` : sans eux, un serveur répondant
    // autre chose que du JSON laissait le bouton bloqué sur « Passage en
    // cours... » sans message — et sur une campagne de passage, rien
    // n'aurait dit au Gestionnaire si elle était partie ou non. Voir
    // `lireReponse` dans src/lib/api.ts.
    try {
      const reponse = await apiFetch("/groupes/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anneeAcademiqueCible: anneeCible,
          groupes: selectionnees.map((l) => ({
            id: l.groupe.id,
            nom: l.nom.trim(),
            effectif: Number(l.effectif),
            specialite: l.specialite,
          })),
        }),
      });
      const data = await lireReponse<{ erreur?: string }>(reponse);

      if (!reponse.ok) {
        setErreur(messageErreur(reponse, data, "Impossible d'effectuer le passage."));
        return;
      }
      onPromu();
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Progression des promotions</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {anneesDisponibles.length === 0 ? (
          <p className="text-sm text-text-muted">
            Aucun groupe éligible à un passage. Les groupes de niveau L3 ou M2 sont en fin de cycle — ils ne
            passent pas à un niveau supérieur, et un groupe déjà promu n&apos;apparaît plus ici.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label htmlFor="passage-annee-source" className="text-sm font-medium text-text">
                  Année académique source
                </label>
                <select
                  id="passage-annee-source"
                  value={anneeSource}
                  onChange={(e) => changerAnneeSource(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  {anneesDisponibles.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />
              <div>
                <span className="text-sm font-medium text-text">Année cible</span>
                <p className="mt-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text-muted">
                  {anneeCible}
                </p>
              </div>
            </div>

            <p className="text-xs text-text-subtle">
              Chaque ligne crée un NOUVEAU groupe pour {anneeCible} — le groupe de {anneeSource} reste inchangé
              dans le référentiel. Vérifiez le nom et corrigez l&apos;effectif : il ne diminue jamais tout seul.
            </p>

            <p className="text-xs text-text-subtle">
              Un groupe ne peut être promu qu&apos;une fois. Si une promotion se scinde en plusieurs
              spécialités (une L1 de tronc commun qui devient quatre L2), promouvez-la vers la première puis
              créez les autres groupes depuis « Nouveau groupe ».
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="bg-surface-muted text-xs uppercase tracking-wide text-text-subtle">
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">Inclure</span>
                    </th>
                    {/* [V8] « Niveau », le mot juste : cette colonne montre
                        le passage L1 → L2. Le parcours est devenu la
                        spécialité, colonne ajoutée après le nom. */}
                    <th className="px-3 py-2 font-medium">Niveau</th>
                    <th className="px-3 py-2 font-medium">Nouveau nom</th>
                    <th className="px-3 py-2 font-medium">Spécialité</th>
                    <th className="px-3 py-2 font-medium">Effectif</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, index) => (
                    <tr key={ligne.groupe.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={ligne.inclure}
                          onChange={(e) =>
                            setLignes((prev) =>
                              prev.map((l, i) => (i === index ? { ...l, inclure: e.target.checked } : l))
                            )
                          }
                          aria-label={`Inclure ${ligne.groupe.nom}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-text-muted">
                        {ligne.groupe.niveau} → {NIVEAU_SUIVANT[ligne.groupe.niveau]}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={ligne.nom}
                          disabled={!ligne.inclure}
                          onChange={(e) =>
                            setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, nom: e.target.value } : l)))
                          }
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {/* Désactivée quand le niveau cible n'offre aucune
                            spécialité : c'est le cas d'un cursus sans
                            choix, et le dire vaut mieux que de proposer une
                            liste vide. */}
                        {(() => {
                          const options = specialitesPour(ligne.groupe);
                          return (
                            <select
                              value={ligne.specialite}
                              disabled={options.length === 0}
                              onChange={(e) =>
                                setLignes((prev) =>
                                  prev.map((l, i) =>
                                    i === index ? { ...l, specialite: e.target.value } : l
                                  )
                                )
                              }
                              aria-label={`Spécialité du groupe issu de ${ligne.groupe.nom}`}
                              className="w-full min-w-[140px] rounded-lg border border-border bg-surface px-2 py-1.5 text-sm disabled:opacity-60"
                            >
                              <option value="">
                                {options.length === 0 ? "Aucune à ce niveau" : "Choisir..."}
                              </option>
                              {options.map((sp) => (
                                <option key={sp.id} value={sp.libelle}>
                                  {sp.libelle}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={ligne.effectif}
                          disabled={!ligne.inclure}
                          onChange={(e) =>
                            setLignes((prev) =>
                              prev.map((l, i) => (i === index ? { ...l, effectif: e.target.value } : l))
                            )
                          }
                          className="w-24 rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {erreur ? (
              <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Annuler
              </button>
              <button
                onClick={handleValider}
                disabled={enCours || selectionnees.length === 0}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {enCours ? "Passage en cours..." : `Confirmer le passage (${selectionnees.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
