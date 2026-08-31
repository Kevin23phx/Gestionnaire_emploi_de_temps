"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, UserPlus } from "lucide-react";
import type { UfrAvecGestionnaire } from "@/lib/types";
import { Badge } from "@/components/ui/StatusBadge";
import { apiFetch } from "@/lib/api";
import { UfrFormModal } from "@/components/ufrs/UfrFormModal";
import { GestionnaireFormModal } from "@/components/ufrs/GestionnaireFormModal";

// FR-ADMIN-01/02 : seul écran où l'Admin agit réellement (création d'UFR et
// de comptes Gestionnaire) — tout le reste de son espace est en lecture
// seule (FR-ADMIN-04).
export default function UfrsAdminPage() {
  const [ufrs, setUfrs] = useState<UfrAvecGestionnaire[] | null>(null);
  const [modaleUfr, setModaleUfr] = useState(false);
  const [ufrPourGestionnaire, setUfrPourGestionnaire] = useState<UfrAvecGestionnaire | null>(null);

  function recharger() {
    apiFetch("/ufrs")
      .then((r) => r.json())
      .then((data) => setUfrs(data.ufrs));
  }

  useEffect(recharger, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">UFR</h1>
        <button
          onClick={() => setModaleUfr(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nouvelle UFR
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-text-subtle">
            <tr>
              <th className="px-4 py-3">UFR</th>
              <th className="px-4 py-3">Sigle</th>
              <th className="px-4 py-3">Gestionnaire</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {ufrs === null ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  Chargement...
                </td>
              </tr>
            ) : ufrs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  Aucune UFR pour l&apos;instant.
                </td>
              </tr>
            ) : (
              ufrs.map((ufr) => (
                <tr key={ufr.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{ufr.nom}</td>
                  <td className="px-4 py-3 uppercase text-text-muted">{ufr.sigle}</td>
                  <td className="px-4 py-3">
                    {ufr.gestionnaire ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-text">{ufr.gestionnaire.identifiant}</code>
                        <Badge
                          tone={ufr.gestionnaire.active ? "success" : "warning"}
                          label={ufr.gestionnaire.active ? "Activé" : "En attente d'activation"}
                        />
                      </div>
                    ) : (
                      <span className="text-text-subtle">Aucun compte</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/ufrs/${ufr.id}`}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Détail
                      </Link>
                      {!ufr.gestionnaire ? (
                        <button
                          onClick={() => setUfrPourGestionnaire(ufr)}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted"
                        >
                          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Créer le compte
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modaleUfr ? (
        <UfrFormModal
          onClose={() => setModaleUfr(false)}
          onSave={() => {
            setModaleUfr(false);
            recharger();
          }}
        />
      ) : null}

      {ufrPourGestionnaire ? (
        <GestionnaireFormModal
          ufr={ufrPourGestionnaire}
          onClose={() => {
            setUfrPourGestionnaire(null);
            recharger();
          }}
          onCreated={recharger}
        />
      ) : null}
    </div>
  );
}
