"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Creneau, Groupe, Salle, UfrAvecGestionnaire, UniteEnseignement } from "@/lib/types";
import { apiFetch } from "@/lib/api";

// [V3.1] L'onglet « Étudiants » a disparu avec le référentiel nominatif :
// l'effectif d'un groupe est un nombre, visible dans l'onglet Groupes.
type Onglet = "groupes" | "salles" | "cours" | "planning";

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: "groupes", label: "Groupes" },
  { id: "salles", label: "Salles" },
  { id: "cours", label: "Cours" },
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
  const [salles, setSalles] = useState<Salle[] | null>(null);
  const [cours, setCours] = useState<UniteEnseignement[] | null>(null);
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);

  useEffect(() => {
    apiFetch("/ufrs")
      .then((r) => r.json())
      .then((data) => setUfr((data.ufrs as UfrAvecGestionnaire[]).find((u) => u.id === id) ?? null));
    apiFetch(`/groupes?ufrId=${id}`).then((r) => r.json()).then((data) => setGroupes(data.groupes));
    apiFetch(`/salles?ufrId=${id}`).then((r) => r.json()).then((data) => setSalles(data.salles));
    apiFetch(`/cours?ufrId=${id}`).then((r) => r.json()).then((data) => setCours(data.cours));
    apiFetch(`/creneaux?ufrId=${id}`).then((r) => r.json()).then((data) => setCreneaux(data.creneaux));
  }, [id]);

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
          colonnes={["Nom", "Département", "Niveau", "Année", "Effectif"]}
          lignes={(groupes ?? []).map((g) => [g.nom, g.departement, g.niveau, g.anneeAcademique, `${g.effectif}`])}
        />
      ) : null}

      {onglet === "salles" ? (
        <TableGeneric
          donnees={salles}
          colonnes={["Nom", "Bâtiment", "Capacité", "Type", "Structure"]}
          lignes={(salles ?? []).map((s) => [s.nom, s.batiment, `${s.capacite}`, s.typeUsage, s.structureGestionnaire])}
        />
      ) : null}

      {onglet === "cours" ? (
        <TableGeneric
          donnees={cours}
          colonnes={["Code", "Intitulé", "Niveau"]}
          lignes={(cours ?? []).map((c) => [c.code, c.intitule, c.niveau])}
        />
      ) : null}

      {onglet === "planning" ? (
        <TableGeneric
          donnees={creneaux}
          colonnes={["Jour", "Horaire", "Cours", "Enseignant", "Groupe", "Salle"]}
          lignes={(creneaux ?? []).map((c) => [
            c.jour,
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
