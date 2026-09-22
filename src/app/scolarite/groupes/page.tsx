"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpCircle, Check, Plus, X } from "lucide-react";
import type { Departement, Groupe } from "@/lib/types";
import { GroupeFormModal } from "@/components/groupes/GroupeFormModal";
import { PassagePromotionModal } from "@/components/groupes/PassagePromotionModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresManuel, valeursDistinctes } from "@/lib/filtres";
import { NIVEAUX, anneesAcademiques } from "@/lib/referentiel-options";

// [V3.1] L'effectif est une valeur saisie, plus le résultat d'un import
// nominatif d'étudiants (section supprimée). Il est donc modifiable
// directement dans le tableau : un effectif bouge en cours d'année
// (abandons, inscriptions tardives), et s'il n'était modifiable qu'à la
// création, la détection de conflit de capacité (RM-02) travaillerait vite
// sur une valeur périmée sans que personne ne s'en aperçoive.
//
// [2026-09] Retour des gestionnaires : renommé "Groupes" -> "Promotions",
// et — comme le reste du référentiel gestionnaire — rien ne charge avant un
// clic explicite sur "Actualiser".
export default function GroupesPage() {
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [departementsRef, setDepartementsRef] = useState<Departement[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [passageOuvert, setPassageOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [valeurEdition, setValeurEdition] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise } = useFiltresManuel();

  // Référentiel léger (liste des départements) : toujours chargé, pour que
  // le filtre "Département" propose ses options avant même une première
  // actualisation — la liste elle-même (potentiellement lourde) reste gatée.
  useEffect(() => {
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data) => setDepartementsRef(data.departements));
  }, []);

  useEffect(() => {
    if (!aActualise) return;
    apiFetch("/groupes")
      .then((r) => r.json())
      .then((data) => setGroupes(data.groupes));
  }, [aActualise]);

  // [V6] Retour d'usage : après une progression de promotion, le groupe
  // source (historique, jamais supprimé — cf. FR-REF-12) restait mélangé
  // avec les groupes actifs, et la liste devient vite illisible avec
  // plusieurs années accumulées. Correctif choisi : ne PAS perdre
  // l'historique (l'effectif d'une année passée doit rester consultable),
  // mais présenter par défaut uniquement l'année en cours — le filtre
  // "Année" existe déjà, on se contente de le préremplir une fois au
  // premier chargement. Un Gestionnaire qui veut voir une année passée
  // choisit "Tous" ou une année précise, comme avant.
  useEffect(() => {
    if (!brouillon("annee")) definirBrouillon("annee", anneesAcademiques()[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tous = useMemo(() => groupes ?? [], [groupes]);
  const departements = useMemo(
    () => valeursDistinctes(departementsRef ?? [], (d) => d.libelle),
    [departementsRef]
  );
  const filtres = useMemo(
    () =>
      tous.filter(
        (g) =>
          correspond(valeur("q"), g.nom, g.departement) &&
          (!valeur("departement") || g.departement === valeur("departement")) &&
          (!valeur("niveau") || g.niveau === valeur("niveau")) &&
          (!valeur("annee") || g.anneeAcademique === valeur("annee"))
      ),
    [tous, valeur]
  );
  // [2026-09] Retour des gestionnaires : Actualiser ne se débloque que si
  // les 3 filtres (Département, Niveau, Année) sont tous renseignés.
  const peutActualiser = Boolean(brouillon("departement") && brouillon("niveau") && brouillon("annee"));

  function commencerEdition(groupe: Groupe) {
    setEnEdition(groupe.id);
    setValeurEdition(String(groupe.effectif));
    setErreur(null);
  }

  async function enregistrerEffectif(groupeId: string) {
    const nombre = Number(valeurEdition);
    if (!Number.isInteger(nombre) || nombre < 0) {
      setErreur("L'effectif doit être un nombre entier positif.");
      return;
    }
    const reponse = await apiFetch(`/groupes/${groupeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effectif: nombre }),
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      setErreur(data.erreur ?? "Impossible de modifier l'effectif.");
      return;
    }
    setGroupes((prev) => (prev ?? []).map((g) => (g.id === groupeId ? data.groupe : g)));
    setEnEdition(null);
    setErreur(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Promotions</h1>
          <p className="text-sm text-text-muted">
            Référentiel des promotions/départements de votre établissement
            {aActualise && groupes ? ` — ${groupes.length} promotions.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPassageOuvert(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
          >
            <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
            Progression des promotions
          </button>
          <button
            onClick={() => setModalOuvert(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nouvelle promotion
          </button>
        </div>
      </div>

      <BarreFiltres
        placeholder="Rechercher une promotion ou un département..."
        filtres={[
          { cle: "departement", label: "Département", options: departements },
          { cle: "niveau", label: "Niveau", options: [...NIVEAUX] },
          { cle: "annee", label: "Année", options: anneesAcademiques() },
        ]}
        valeur={brouillon}
        definir={definirBrouillon}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
        manuel
        onActualiser={actualiser}
        peutActualiser={peutActualiser}
      />

      {erreur ? (
        <p className="mb-3 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
      ) : null}

      {!aActualise ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Choisissez un Département, un Niveau et une Année, puis cliquez sur Actualiser pour afficher les
          promotions.
        </div>
      ) : (
        <>
          {/* ERR-10 : signalé une fois en tête plutôt que sur chaque ligne —
              l'information utile est « il vous reste des effectifs à saisir »,
              pas la répétition du même avertissement. */}
          {groupes !== null && tous.some((g) => g.effectif === 0) ? (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-status-warning-bg px-3 py-2 text-sm text-text">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
              <span>
                {tous.filter((g) => g.effectif === 0).length} promotion(s) sans effectif renseigné. Tant
                qu&apos;il vaut zéro, aucune alerte ne vous préviendra si la salle choisie est trop petite pour
                le groupe.
              </span>
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-text-subtle">
                  <th className="px-4 py-2 font-medium">Promotion</th>
                  <th className="px-4 py-2 font-medium">Département</th>
                  {/* [V8] « Niveau » et non « Parcours » : cette colonne a
                      toujours affiché groupe.niveau. Le parcours est
                      devenu la spécialité, colonne suivante. */}
                  <th className="px-4 py-2 font-medium">Niveau</th>
                  <th className="px-4 py-2 font-medium">Spécialité</th>
                  <th className="px-4 py-2 font-medium">Nombre d&apos;étudiants</th>
                </tr>
              </thead>
              <tbody>
                {filtres.map((groupe) => (
                  <tr key={groupe.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-text">
                      {groupe.nom} <span className="font-normal text-text-subtle">({groupe.anneeAcademique})</span>
                      {groupe.aDejaEteSuccede ? (
                        <span
                          className="ml-2 rounded-full bg-status-success-bg px-2 py-0.5 text-xs font-normal text-status-success"
                          title="Une promotion de l'année suivante a déjà été créée à partir de celle-ci"
                        >
                          promu
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-text-muted">{groupe.departement}</td>
                    <td className="px-4 py-2 text-text-muted">{groupe.niveau}</td>
                    <td className="px-4 py-2 text-text-muted">
                      {/* Un tiret, pas une cellule vide : « ce niveau est un
                          tronc commun » est une information, une case
                          blanche ressemble à un oubli de saisie. */}
                      {groupe.specialite || <span className="text-text-subtle">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {enEdition === groupe.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            autoFocus
                            value={valeurEdition}
                            onChange={(e) => setValeurEdition(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") enregistrerEffectif(groupe.id);
                              if (e.key === "Escape") setEnEdition(null);
                            }}
                            aria-label={`Nombre d'étudiants de ${groupe.nom}`}
                            className="w-24 rounded-lg border border-border px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => enregistrerEffectif(groupe.id)}
                            aria-label="Enregistrer"
                            className="rounded-lg p-1.5 text-status-success hover:bg-surface-muted"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setEnEdition(null)}
                            aria-label="Annuler"
                            className="rounded-lg p-1.5 text-text-subtle hover:bg-surface-muted"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => commencerEdition(groupe)}
                          className="flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-left text-text-muted hover:border-border hover:bg-surface-muted"
                          title="Cliquez pour modifier"
                        >
                          {groupe.effectif > 0 ? (
                            `${groupe.effectif} étudiant${groupe.effectif > 1 ? "s" : ""}`
                          ) : (
                            // ERR-10 : un effectif à zéro n'est pas une erreur en
                            // soi (un groupe peut être créé avant la rentrée),
                            // mais il rend MUETTE l'alerte de capacité pour ce
                            // groupe. Le dire ici, plutôt que de le laisser
                            // découvrir le jour où l'amphi est trop petit.
                            <>
                              <AlertTriangle className="h-3.5 w-3.5 text-status-warning" aria-hidden="true" />
                              <span className="text-status-warning">Non renseigné</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {groupes === null ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
            ) : filtres.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                {tous.length === 0 ? "Aucune promotion dans le référentiel." : "Aucune promotion ne correspond à ces filtres."}
              </p>
            ) : null}
          </div>
        </>
      )}

      {modalOuvert ? (
        <GroupeFormModal
          onClose={() => setModalOuvert(false)}
          onSave={(groupe) => {
            setGroupes((prev) => [...(prev ?? []), groupe]);
            setModalOuvert(false);
          }}
        />
      ) : null}

      {passageOuvert ? (
        <PassagePromotionModal
          groupes={tous}
          onClose={() => setPassageOuvert(false)}
          onPromu={() => {
            // Recharge plutôt que de fusionner localement : les groupes
            // sources sont désormais `aDejaEteSuccede`, et c'est plus simple
            // de relire le référentiel que de recalculer ce marquage ici.
            apiFetch("/groupes")
              .then((r) => r.json())
              .then((data) => setGroupes(data.groupes));
            setPassageOuvert(false);
          }}
        />
      ) : null}
    </div>
  );
}
