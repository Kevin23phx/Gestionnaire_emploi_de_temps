"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import type { Creneau, Departement, Groupe, UfrAvecGestionnaire, UniteEnseignement } from "@/lib/types";
import { apiFetch, chargerJson, lireReponse, messageErreur } from "@/lib/api";

// [V3.1] L'onglet « Étudiants » a disparu avec le référentiel nominatif :
// l'effectif d'un groupe est un nombre, visible dans l'onglet Promotions.
//
// [2026-09] Plus d'onglet « Salles » ici : les salles ne sont plus
// rattachées à une UFR (exception ciblée à INT-07, cf.
// 03_Contrat_Invariants_Campus_Manager.md [V7]) — un référentiel unique,
// partagé par toute l'université, n'a plus sa place dans la fiche d'UN
// établissement.
type Onglet = "groupes" | "cours" | "departements" | "planning";

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: "groupes", label: "Promotions" },
  { id: "cours", label: "Cours" },
  // [2026-09] Retour des gestionnaires : l'Admin doit pouvoir créer un
  // département si le Gestionnaire de l'UFR n'est pas disponible (exception
  // ciblée à INV-11, cf. 03_Contrat_Invariants_Campus_Manager.md [V7]).
  { id: "departements", label: "Départements" },
  { id: "planning", label: "Planning" },
];

// FR-ADMIN-06 : l'Admin supervise le détail d'un établissement précis — pas
// seulement des compteurs agrégés (/admin, FR-ADMIN-03) ni le journal
// d'audit seul (/admin/audit). Tout est en lecture seule (FR-ADMIN-04) :
// aucune action de création/modification ici, uniquement des tableaux.
export default function UfrDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [onglet, setOnglet] = useState<Onglet>("groupes");
  const [ufr, setUfr] = useState<UfrAvecGestionnaire | null>(null);
  const [groupes, setGroupes] = useState<Groupe[] | null>(null);
  const [cours, setCours] = useState<UniteEnseignement[] | null>(null);
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [departements, setDepartements] = useState<Departement[] | null>(null);
  const [nouveauDepartement, setNouveauDepartement] = useState("");
  const [erreurDepartement, setErreurDepartement] = useState<string | null>(null);
  const [enCoursDepartement, setEnCoursDepartement] = useState(false);

  function chargerDepartements() {
    chargerJson<{ departements?: Departement[] }>(`/departements?ufrId=${id}`).then((data) =>
      setDepartements(data?.departements ?? [])
    );
  }

  useEffect(() => {
    // [V8.6] `chargerJson` : une session expirée renvoyait 401 avec un
    // corps sans `ufrs`, et le `.find` plantait la page entière.
    chargerJson<{ ufrs?: UfrAvecGestionnaire[] }>("/ufrs").then((data) =>
      setUfr((data?.ufrs ?? []).find((u) => u.id === id) ?? null)
    );
    chargerJson<{ groupes?: Groupe[] }>(`/groupes?ufrId=${id}`).then((d) => setGroupes(d?.groupes ?? []));
    chargerJson<{ cours?: UniteEnseignement[] }>(`/cours?ufrId=${id}`).then((d) => setCours(d?.cours ?? []));
    chargerJson<{ creneaux?: Creneau[] }>(`/creneaux?ufrId=${id}`).then((d) => setCreneaux(d?.creneaux ?? []));
    chargerDepartements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function creerDepartement() {
    if (!nouveauDepartement.trim()) return;
    setErreurDepartement(null);
    setEnCoursDepartement(true);
    // [V8.6] Enveloppé : sans cela, un serveur injoignable ou une réponse
    // non-JSON laissait le bouton figé sur « Création... », sans message.
    try {
      const reponse = await apiFetch("/departements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: nouveauDepartement, ufrId: id }),
      });
      const data = await lireReponse<{ erreur?: string }>(reponse);
      if (!reponse.ok) {
        setErreurDepartement(messageErreur(reponse, data, "Impossible de créer le département."));
        return;
      }
      setNouveauDepartement("");
      chargerDepartements();
    } catch {
      setErreurDepartement("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCoursDepartement(false);
    }
  }

  return (
    <div>
      <Link href="/admin/ufrs" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour aux établissements
      </Link>

      <h1 className="mb-1 text-xl font-bold text-text">{ufr?.nom ?? "Établissement"}</h1>
      <p className="mb-6 text-sm text-text-muted">
        Gestionnaire :{" "}
        {ufr?.gestionnaire ? (
          <>
            <code>{ufr.gestionnaire.identifiant}</code> ({ufr.gestionnaire.active ? "activé" : "en attente d'activation"})
          </>
        ) : (
          "aucun compte"
        )}
      </p>

      <div className="mb-4 flex gap-1 border-b border-border">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              onglet === o.id ? "border-brand text-brand" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "groupes" ? (
        <TableGeneric
          donnees={groupes}
          colonnes={["Nom", "Département", "Niveau", "Spécialité", "Année", "Effectif"]}
          // [V8] Un tiret quand le groupe ne porte aucune spécialité : une
          // cellule vide dans un tableau de supervision se lit comme une
          // donnée manquante, alors que c'est un état normal (tronc commun,
          // ou groupe unique dont ce sont les créneaux qui sont affectés).
          lignes={(groupes ?? []).map((g) => [
            g.nom,
            g.departement,
            g.niveau,
            g.specialite || "—",
            g.anneeAcademique,
            `${g.effectif}`,
          ])}
        />
      ) : null}

      {onglet === "cours" ? (
        <TableGeneric
          donnees={cours}
          colonnes={["Code", "Intitulé"]}
          lignes={(cours ?? []).map((c) => [c.code, c.intitule])}
        />
      ) : null}

      {onglet === "departements" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-text-muted">Nouveau département</span>
              <input
                type="text"
                value={nouveauDepartement}
                onChange={(e) => setNouveauDepartement(e.target.value)}
                placeholder="ex : Informatique"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <button
              onClick={creerDepartement}
              disabled={enCoursDepartement || !nouveauDepartement.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {enCoursDepartement ? "Création..." : "Ajouter"}
            </button>
          </div>
          {erreurDepartement ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreurDepartement}</p>
          ) : null}
          <TableGeneric
            donnees={departements}
            colonnes={["Libellé"]}
            lignes={(departements ?? []).map((d) => [d.libelle])}
          />
        </div>
      ) : null}

      {onglet === "planning" ? (
        <TableGeneric
          donnees={creneaux}
          colonnes={["Date", "Horaire", "Cours", "Enseignant", "Groupe", "Salle"]}
          // [V4] Une séance est datée : le jour de semaine seul mélangeait
          // toutes les semaines publiées (« lundi » valait pour chacune).
          // Triées dans l'ordre chronologique pour la même raison.
          lignes={[...(creneaux ?? [])]
            .sort((a, b) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut))
            .map((c) => [
            `${c.jour} ${c.date.split("-").reverse().join("/")}`,
            `${c.heureDebut}-${c.heureFin}`,
            c.ue.intitule,
            `${c.enseignant.prenom} ${c.enseignant.nom}`,
            c.groupe.nom,
            c.salle.nom,
          ])}
        />
      ) : null}
    </div>
  );
}

function TableGeneric({ donnees, colonnes, lignes }: { donnees: unknown[] | null; colonnes: string[]; lignes: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-text-subtle">
            {colonnes.map((c) => (
              <th key={c} className="px-4 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, i) => (
            <tr key={i} className="border-t border-border">
              {ligne.map((valeur, j) => (
                <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium text-text" : "text-text-muted"}`}>
                  {valeur}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {donnees === null ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">Chargement...</p>
      ) : lignes.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-muted">Aucune donnée pour cet établissement.</p>
      ) : null}
    </div>
  );
}
