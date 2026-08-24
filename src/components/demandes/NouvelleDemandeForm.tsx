"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Creneau, TypeDemande } from "@/lib/types";
import { calculerFenetresLibres, type FenetreLibre } from "@/lib/disponibilites";
import { apiFetch } from "@/lib/api";

const TYPES: { value: TypeDemande; label: string }[] = [
  { value: "absence", label: "Signaler une absence" },
  { value: "report", label: "Demander un report" },
  { value: "permutation", label: "Demander une permutation" },
];

function libelleFenetre(f: FenetreLibre): string {
  return `${f.jour} ${f.heureDebut}-${f.heureFin}`;
}

// FR-SIG-01 : formulaire de signalement — chaque demande créée reste
// "en_attente" jusqu'à validation de la Scolarité (FR-SIG-02, RM-04).
//
// Plusieurs créneaux concernés à la fois (retour utilisateur : "logique
// qu'il veuille choisir plusieurs créneaux") — le backend ne modélise
// qu'UNE demande = UN créneau (RM-04, historique décision individuelle par
// créneau), donc une sélection multiple envoie une demande par créneau
// sélectionné plutôt que d'introduire un nouveau modèle de "lot" — chacune
// garde son propre cycle de vie (validée/refusée indépendamment).
export function NouvelleDemandeForm({
  creneaux,
  programmeComplet,
}: {
  creneaux: Creneau[]; // le planning propre de l'enseignant (aussi utilisé pour calculer ses fenêtres libres)
  programmeComplet: Creneau[]; // programme complet de l'UFR — nécessaire pour choisir un créneau d'un AUTRE enseignant en permutation
}) {
  const [type, setType] = useState<TypeDemande>("absence");
  const [creneauIds, setCreneauIds] = useState<Set<string>>(
    new Set(creneaux[0] ? [creneaux[0].id] : []),
  );
  const [motif, setMotif] = useState("");
  const [fenetreChoisie, setFenetreChoisie] = useState("");
  const [creneauProposeId, setCreneauProposeId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<{ reussies: number; echecs: string[] } | null>(null);

  const fenetresLibres = useMemo(() => calculerFenetresLibres(creneaux), [creneaux]);
  const fenetreSelectionnee = fenetresLibres.find((f) => libelleFenetre(f) === fenetreChoisie);

  // Pour permuter, on ne se propose jamais soi-même : exclut les créneaux
  // déjà cochés comme "concernés" de la liste des cibles possibles.
  const creneauxProposables = programmeComplet.filter((c) => !creneauIds.has(c.id));

  function toggleCreneau(id: string) {
    setCreneauIds((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (creneauIds.size === 0) {
      setErreur("Sélectionnez au moins un créneau concerné.");
      return;
    }
    if (!motif.trim()) {
      setErreur("Le motif est obligatoire.");
      return;
    }
    if (type === "report" && !fenetreSelectionnee) {
      setErreur("Choisissez un créneau libre pour le report.");
      return;
    }
    if (type === "permutation" && !creneauProposeId) {
      setErreur("Choisissez le créneau avec lequel permuter.");
      return;
    }
    setErreur(null);
    setEnCours(true);

    const echecs: string[] = [];
    let reussies = 0;
    for (const creneauConcerneId of creneauIds) {
      const body: Record<string, unknown> = { type, creneauConcerneId, motif: motif.trim() };
      if (type === "report" && fenetreSelectionnee) {
        Object.assign(body, {
          jourPropose: fenetreSelectionnee.jour,
          heureDebutProposee: fenetreSelectionnee.heureDebut,
          heureFinProposee: fenetreSelectionnee.heureFin,
          // Pas de salle : seule la scolarité assigne une salle (FR-REF-02).
        });
      }
      if (type === "permutation") {
        body.creneauProposeId = creneauProposeId;
      }

      const reponse = await apiFetch("/demandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (reponse.ok) {
        reussies++;
      } else {
        const data = await reponse.json();
        const creneau = creneaux.find((c) => c.id === creneauConcerneId) ?? programmeComplet.find((c) => c.id === creneauConcerneId);
        echecs.push(`${creneau?.ue.intitule ?? creneauConcerneId} : ${data.erreur ?? "échec"}`);
      }
    }

    setEnCours(false);
    setResultat({ reussies, echecs });
    if (echecs.length === 0) {
      setCreneauIds(new Set());
      setMotif("");
      setFenetreChoisie("");
      setCreneauProposeId("");
    }
  }

  if (resultat && resultat.echecs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-status-success-bg px-4 py-3 text-sm text-status-success">
          {resultat.reussies > 1 ? `${resultat.reussies} demandes envoyées` : "Votre demande a été envoyée"} à la
          scolarité de votre UFR et {resultat.reussies > 1 ? "sont" : "est"} en attente de validation.
        </p>
        <button
          onClick={() => setResultat(null)}
          className="self-start text-sm font-medium text-brand hover:underline"
        >
          Faire une nouvelle demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <label htmlFor="type-demande" className="text-sm font-medium text-text">
          Type de demande
        </label>
        <select
          id="type-demande"
          value={type}
          onChange={(e) => {
            setType(e.target.value as TypeDemande);
            setFenetreChoisie("");
            setCreneauProposeId("");
          }}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-text">
          Créneau(x) concerné(s) — sélectionnez-en un ou plusieurs
        </label>
        <div className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
          {creneaux.length === 0 ? (
            <p className="px-1 py-1 text-xs text-text-muted">Aucun créneau dans votre planning.</p>
          ) : (
            creneaux.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-surface-muted">
                <input
                  type="checkbox"
                  checked={creneauIds.has(c.id)}
                  onChange={() => toggleCreneau(c.id)}
                  className="h-4 w-4 accent-brand"
                />
                <span>
                  {c.ue.intitule} — {c.jour} {c.heureDebut}-{c.heureFin}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {type === "report" ? (
        <div>
          <label htmlFor="fenetre-libre" className="text-sm font-medium text-text">
            Nouveau créneau (libre dans votre planning uniquement)
          </label>
          <select
            id="fenetre-libre"
            value={fenetreChoisie}
            onChange={(e) => setFenetreChoisie(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Choisir un créneau libre</option>
            {fenetresLibres.map((f) => (
              <option key={libelleFenetre(f)} value={libelleFenetre(f)}>
                {libelleFenetre(f)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-subtle">
            La salle reste celle du cours actuel — seule la scolarité peut la changer.
          </p>
        </div>
      ) : null}

      {type === "permutation" ? (
        <div>
          <label htmlFor="creneau-propose" className="text-sm font-medium text-text">
            Permuter avec (tout enseignant)
          </label>
          <select
            id="creneau-propose"
            value={creneauProposeId}
            onChange={(e) => setCreneauProposeId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Choisir un créneau</option>
            {creneauxProposables.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ue.intitule} — {c.enseignant.prenom} {c.enseignant.nom} — {c.jour} {c.heureDebut}-{c.heureFin}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="motif" className="text-sm font-medium text-text">
          Motif
        </label>
        <textarea
          id="motif"
          required
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Expliquez la raison de votre demande"
        />
      </div>

      {erreur ? (
        <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
      ) : null}

      {resultat && resultat.echecs.length > 0 ? (
        <div className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
          <p>{resultat.reussies} envoyée(s), {resultat.echecs.length} échouée(s) :</p>
          <ul className="mt-1 list-inside list-disc">
            {resultat.echecs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {enCours ? "Envoi..." : creneauIds.size > 1 ? `Envoyer ${creneauIds.size} demandes` : "Envoyer la demande"}
      </button>
    </form>
  );
}
