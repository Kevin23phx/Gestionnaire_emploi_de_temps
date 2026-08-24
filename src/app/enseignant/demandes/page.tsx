import { apiFetchServer } from "@/lib/api-server";
import type { Creneau, DemandeEnseignant } from "@/lib/types";
import { DemandeStatusBadge } from "@/components/ui/StatusBadge";
import { NouvelleDemandeForm } from "@/components/demandes/NouvelleDemandeForm";

export default async function MesDemandesPage() {
  // Le périmètre (un enseignant ne voit que son propre planning/ses propres
  // demandes) est déjà appliqué côté backend (INT-06). /creneaux/pour-permutation
  // est l'exception volontaire : programme complet de l'UFR, nécessaire pour
  // choisir le créneau d'un AUTRE enseignant au moment d'une permutation.
  const [reponseCreneaux, reponseDemandes, reponseProgrammeComplet] = await Promise.all([
    apiFetchServer("/creneaux"),
    apiFetchServer("/demandes"),
    apiFetchServer("/creneaux/pour-permutation"),
  ]);
  const { creneaux }: { creneaux: Creneau[] } = reponseCreneaux.ok
    ? await reponseCreneaux.json()
    : { creneaux: [] };
  const { demandes }: { demandes: DemandeEnseignant[] } = reponseDemandes.ok
    ? await reponseDemandes.json()
    : { demandes: [] };
  const { creneaux: programmeComplet }: { creneaux: Creneau[] } = reponseProgrammeComplet.ok
    ? await reponseProgrammeComplet.json()
    : { creneaux: [] };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-xl font-bold text-text">Mes demandes</h1>
        <div className="flex flex-col gap-3">
          {demandes.length === 0 ? (
            <p className="text-sm text-text-muted">Aucune demande en cours.</p>
          ) : (
            demandes.map((demande) => {
              const creneau = creneaux.find((c) => c.id === demande.creneauConcerneId);
              return (
                <div key={demande.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text capitalize">
                      {demande.type}
                    </span>
                    <DemandeStatusBadge statut={demande.statut} />
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    {creneau?.ue.intitule} — {creneau?.jour} {creneau?.heureDebut}-{creneau?.heureFin}
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">Motif : {demande.motif}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-text">Nouvelle demande</h2>
        <NouvelleDemandeForm creneaux={creneaux} programmeComplet={programmeComplet} />
      </div>
    </div>
  );
}
