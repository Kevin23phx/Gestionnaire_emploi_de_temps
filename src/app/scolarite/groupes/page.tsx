"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import type { Groupe } from "@/lib/types";
import { GroupeFormModal } from "@/components/groupes/GroupeFormModal";
import { BarreFiltres } from "@/components/filtres/BarreFiltres";
import { apiFetch } from "@/lib/api";
import { correspond, useFiltresUrl, valeursDistinctes } from "@/lib/filtres";

// [V3.1] L'effectif est une valeur saisie, plus le résultat d'un import
// nominatif d'étudiants (section supprimée). Il est donc modifiable
// directement dans le tableau : un effectif bouge en cours d'année
// (abandons, inscriptions tardives), et s'il n'était modifiable qu'à la
// création, la détection de conflit de capacité (RM-02) travaillerait vite
// sur une valeur périmée sans que personne ne s'en aperçoive.
export default function GroupesPage() {
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [valeurEdition, setValeurEdition] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const { valeur, definir, reinitialiser, actifs } = useFiltresUrl();

  useEffect(() => {
    apiFetch("/groupes")
      .then((r) => r.json())
      .then((data) => setGroupes(data.groupes));
  }, []);

  // FR-FILT-06 : filtrage côté client, à dessein. Les groupes d'une seule
  // UFR se comptent en dizaines — les faire transiter en entier coûte moins
  // qu'un aller-retour réseau à chaque frappe, sur des connexions où c'est
  // justement la latence qui fait mal (cahier des charges §1.4).
  const tous = useMemo(() => groupes ?? [], [groupes]);
  const departements = useMemo(() => valeursDistinctes(tous, (g) => g.departement), [tous]);
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
          <h1 className="text-xl font-bold text-text">Groupes</h1>
          <p className="text-sm text-text-muted">
            Référentiel des groupes/départements de votre établissement
            {groupes ? ` — ${groupes.length} groupes.` : "..."}
          </p>
        </div>
        <button
          onClick={() => setModalOuvert(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouveau groupe
        </button>
      </div>

      <BarreFiltres
        placeholder="Rechercher un groupe ou un département..."
        filtres={[
          { cle: "departement", label: "Département", options: departements },
          { cle: "niveau", label: "Niveau", options: valeursDistinctes(tous, (g) => g.niveau) },
          { cle: "annee", label: "Année", options: valeursDistinctes(tous, (g) => g.anneeAcademique) },
        ]}
        valeur={valeur}
        definir={definir}
        reinitialiser={reinitialiser}
        actifs={actifs}
        resultats={filtres.length}
        total={tous.length}
      />

      {erreur ? (
        <p className="mb-3 rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
      ) : null}

      {/* ERR-10 : signalé une fois en tête plutôt que sur chaque ligne —
          l'information utile est « il vous reste des effectifs à saisir »,
          pas la répétition du même avertissement. */}
      {groupes !== null && tous.some((g) => g.effectif === 0) ? (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-status-warning-bg px-3 py-2 text-sm text-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
          <span>
            {tous.filter((g) => g.effectif === 0).length} groupe(s) sans effectif renseigné. Tant qu&apos;il vaut
            zéro, aucune alerte ne vous préviendra si la salle choisie est trop petite pour le groupe.
          </span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Groupe</th>
              <th className="px-4 py-2 font-medium">Département</th>
              <th className="px-4 py-2 font-medium">Niveau</th>
              <th className="px-4 py-2 font-medium">Nombre d&apos;étudiants</th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((groupe) => (
              <tr key={groupe.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-text">
                  {groupe.nom} <span className="font-normal text-text-subtle">({groupe.anneeAcademique})</span>
                </td>
                <td className="px-4 py-2 text-text-muted">{groupe.departement}</td>
                <td className="px-4 py-2 text-text-muted">{groupe.niveau}</td>
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
            {tous.length === 0 ? "Aucun groupe dans le référentiel." : "Aucun groupe ne correspond à ces filtres."}
          </p>
        ) : null}
      </div>

      {modalOuvert ? (
        <GroupeFormModal
          onClose={() => setModalOuvert(false)}
          onSave={(groupe) => {
            setGroupes((prev) => [...(prev ?? []), groupe]);
            setModalOuvert(false);
          }}
        />
      ) : null}
    </div>
  );
}
