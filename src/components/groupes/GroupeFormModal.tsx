"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Departement, Groupe, Specialite } from "@/lib/types";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";
import { AUTRE, NIVEAUX, anneesAcademiques } from "@/lib/referentiel-options";

// [V3.1] FR-REF-12/13 — département, niveau et année académique se
// SÉLECTIONNENT au lieu de se saisir, et l'effectif est un simple nombre.
//
// Deux changements liés :
//
// 1. Les listes déroulantes évitent les variantes d'écriture d'un même
//    département (« Informatique » / « informatique » / « INFO »), qui
//    apparaîtraient comme trois départements distincts dans la cascade
//    publique (FR-PUB-02).
//
//    [V3.2] Les départements viennent désormais du RÉFÉRENTIEL OFFICIEL de
//    l'UJKZ (53 entrées, GET /departements), et non plus des groupes déjà
//    créés. La différence est de fond : une liste déduite des groupes ne
//    peut que se dégrader — chaque faute de frappe y devient un département
//    de plus — alors qu'un référentiel s'enrichit. L'option « + Autre »
//    subsiste et **enregistre** le nouveau département, qui sera proposé
//    aux créations suivantes (FR-REF-21).
//
// 2. L'effectif est saisi directement. Il était auparavant dérivé du nombre
//    d'étudiants importés — un travail de saisie considérable pour une
//    valeur dont le système n'utilise que le nombre, comparé à la capacité
//    d'une salle (RM-02). Contrepartie assumée : le système ne peut plus le
//    vérifier, il vaut ce que le Gestionnaire a saisi.
export function GroupeFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (groupe: Groupe) => void;
}) {
  const annees = anneesAcademiques();

  const [departements, setDepartements] = useState<Departement[] | null>(null);
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [departementLibre, setDepartementLibre] = useState("");
  const [niveau, setNiveau] = useState<string>(NIVEAUX[0]);
  // [V8] Les spécialités chargées, ÉTIQUETÉES du couple (département,
  // niveau) pour lequel elles l'ont été. Sans cette étiquette, une réponse
  // lente pour la L2 s'afficherait comme étant celle de la L3 que l'on
  // vient de sélectionner entre-temps.
  const [specialitesChargees, setSpecialitesChargees] = useState<{
    cle: string;
    liste: Specialite[];
  } | null>(null);
  const [specialite, setSpecialite] = useState("");
  // L'année en cours est au milieu de la liste (précédente, courante,
  // suivante) : c'est le choix juste dans l'immense majorité des cas.
  const [anneeAcademique, setAnneeAcademique] = useState(annees[1]);
  const [effectif, setEffectif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    apiFetch("/departements")
      .then((r) => r.json())
      .then((data: { departements: Departement[] }) => {
        if (annule) return;
        setDepartements(data.departements);
        // Si l'établissement n'a encore aucun département, on ouvre
        // directement sur la saisie libre plutôt que sur une liste vide.
        setDepartement(data.departements[0]?.libelle ?? AUTRE);
      })
      .catch(() => {
        if (!annule) setDepartements([]);
      });
    return () => {
      annule = true;
    };
  }, []);

  const departementRetenu = departement === AUTRE ? departementLibre.trim() : departement;
  const departementChoisiId = (departements ?? []).find((d) => d.libelle === departement)?.id;

  // Identifiant du couple (département, niveau) dont les spécialités sont
  // pertinentes en cet instant. Chaîne vide tant qu'aucun département du
  // référentiel n'est choisi.
  const cleSpecialites = departementChoisiId ? `${departementChoisiId}|${niveau}` : "";

  // Dérivé, jamais posé dans un effet : `[]` quand il n'y a rien à charger
  // ou que la réponse est arrivée vide (tronc commun), `null` tant que la
  // réponse du couple COURANT n'est pas là (chargement). Calculer plutôt
  // que stocker évite l'instant où l'écran montre la liste du couple
  // précédent en la présentant comme celle du nouveau.
  const specialites: Specialite[] | null = !cleSpecialites
    ? []
    : specialitesChargees?.cle === cleSpecialites
      ? specialitesChargees.liste
      : null;

  // [V8] Les spécialités dépendent du COUPLE (département, niveau) : c'est
  // ce qui permet à une L1 de portail (MPCI) de n'en proposer aucune alors
  // que la L2 du même département en propose quatre.
  //
  // Rien n'est chargé pour un département saisi librement (« + Autre ») :
  // il n'existe pas encore au référentiel, donc aucune spécialité ne peut
  // lui être rattachée — elles se déclarent dans l'écran Spécialités, une
  // fois le département créé.
  //
  // La dépendance est l'IDENTIFIANT du département, pas l'objet : un
  // `.find()` renvoie un objet neuf à chaque rendu, et l'effet serait
  // reparti en boucle à chaque frappe dans le formulaire.
  useEffect(() => {
    if (!departementChoisiId) return;
    let annule = false;
    const cle = `${departementChoisiId}|${niveau}`;
    const params = new URLSearchParams({ departementId: departementChoisiId, niveau });
    apiFetch(`/specialites?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { specialites: Specialite[] }) => {
        if (!annule) setSpecialitesChargees({ cle, liste: data.specialites });
      })
      .catch(() => {
        if (!annule) setSpecialitesChargees({ cle, liste: [] });
      });
    return () => {
      annule = true;
    };
  }, [departementChoisiId, niveau]);

  // Le choix ne survit pas à un changement de couple : une spécialité de L2
  // n'a aucune raison d'exister en L3. Filtré à la lecture plutôt que remis
  // à zéro par un effet — un `setSpecialite("")` déclenché par le
  // chargement ferait clignoter le champ, et effacerait le choix même quand
  // il reste valide.
  const specialiteRetenue = (specialites ?? []).some((sp) => sp.libelle === specialite)
    ? specialite
    : "";

  async function handleSubmit() {
    if (!nom.trim() || !departementRetenu) {
      setErreur("Le nom du groupe et le département sont obligatoires.");
      return;
    }
    const nombre = Number(effectif);
    if (effectif !== "" && (!Number.isInteger(nombre) || nombre < 0)) {
      setErreur("L'effectif doit être un nombre entier positif.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    // FR-REF-21 : un département saisi librement rejoint le référentiel de
    // l'établissement, pour être proposé aux créations suivantes. Un échec
    // ici (doublon de casse, par exemple) ne doit pas empêcher la création
    // du groupe lui-même — le libellé est de toute façon correct.
    if (departement === AUTRE && departementRetenu) {
      await apiFetch("/departements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: departementRetenu }),
      }).catch(() => {});
    }

    // [V8] `try/finally` et `lireReponse` : un serveur qui répond autre
    // chose que du JSON (erreur 500 rendue en HTML, coupure réseau) faisait
    // lever `reponse.json()` AVANT le `setEnCours(false)` — le bouton
    // restait alors bloqué sur « Création... », indéfiniment et sans
    // message. Incident reproduit le 2026-09-21 sur l'écran Spécialités ;
    // voir `lireReponse` dans src/lib/api.ts.
    try {
      const reponse = await apiFetch("/groupes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          departement: departementRetenu,
          niveau,
          specialite: specialiteRetenue,
          anneeAcademique,
          effectif: effectif === "" ? 0 : nombre,
        }),
      });
      const data = await lireReponse<{ erreur?: string; groupe?: Groupe }>(reponse);

      if (!reponse.ok || !data.groupe) {
        setErreur(messageErreur(reponse, data, "Impossible de créer le groupe."));
        return;
      }
      onSave(data.groupe);
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Nouveau groupe</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="groupe-nom" className="text-sm font-medium text-text">
              Nom du groupe
            </label>
            <input
              id="groupe-nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: L3 INFO - Groupe B"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="groupe-departement" className="text-sm font-medium text-text">
              Département
            </label>
            <select
              id="groupe-departement"
              value={departement}
              onChange={(e) => setDepartement(e.target.value)}
              disabled={departements === null}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              {departements === null ? <option value="">Chargement...</option> : null}
              {(departements ?? []).map((d) => (
                <option key={d.id} value={d.libelle}>
                  {d.libelle}
                </option>
              ))}
              <option value={AUTRE}>+ Autre département...</option>
            </select>
            {departement === AUTRE ? (
              <>
                <input
                  type="text"
                  value={departementLibre}
                  onChange={(e) => setDepartementLibre(e.target.value)}
                  placeholder="Nom du nouveau département"
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-text-subtle">
                  Il sera ajouté aux départements de votre établissement et proposé la prochaine fois.
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-text-subtle">
                Départements officiels de votre établissement.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              {/* [V8] « Niveau » et non « Parcours » : ce champ a toujours
                  contenu des niveaux du LMD, c'est son libellé qui était
                  faux. Le parcours est devenu la spécialité, ci-dessous. */}
              <label htmlFor="groupe-niveau" className="text-sm font-medium text-text">
                Niveau
              </label>
              <select
                id="groupe-niveau"
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {NIVEAUX.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="groupe-annee" className="text-sm font-medium text-text">
                Année académique
              </label>
              <select
                id="groupe-annee"
                value={anneeAcademique}
                onChange={(e) => setAnneeAcademique(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {annees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* [V8] Spécialité — inactive tant que le niveau choisi n'en
              propose aucune, avec la raison écrite en dessous. Facultative
              par construction : une L1 de tronc commun n'en a pas, et la
              rendre obligatoire interdirait de créer ces groupes-là. */}
          <div>
            <label htmlFor="groupe-specialite" className="text-sm font-medium text-text">
              Spécialité
            </label>
            <select
              id="groupe-specialite"
              value={specialiteRetenue}
              onChange={(e) => setSpecialite(e.target.value)}
              disabled={specialites === null || specialites.length === 0}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="">
                {specialites === null
                  ? "Chargement..."
                  : specialites.length === 0
                    ? "Aucune à ce niveau"
                    : "Choisir..."}
              </option>
              {(specialites ?? []).map((sp) => (
                <option key={sp.id} value={sp.libelle}>
                  {sp.libelle}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-subtle">
              {specialites !== null && specialites.length === 0
                ? `${niveau} n'a pas de spécialité dans ce département : c'est un tronc commun. Pour en ouvrir une, passez par l'écran Spécialités.`
                : "Le choix que suit ce groupe. L'étudiant le retrouvera dans la recherche publique."}
            </p>
          </div>

          <div>
            <label htmlFor="groupe-effectif" className="text-sm font-medium text-text">
              Nombre d&apos;étudiants
            </label>
            <input
              id="groupe-effectif"
              type="number"
              min={0}
              value={effectif}
              onChange={(e) => setEffectif(e.target.value)}
              placeholder="ex: 120"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-subtle">
              Sert à vous alerter quand une salle est trop petite pour le groupe. Modifiable à tout moment.
            </p>
          </div>

          {erreur ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={enCours}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {enCours ? "Création..." : "Créer le groupe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
