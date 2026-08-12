import { getSession } from "@/lib/session";
import { MOCK_CRENEAUX, MOCK_DEMANDES } from "@/lib/mock-data";
import { DemandeStatusBadge } from "@/components/ui/StatusBadge";
import { NouvelleDemandeForm } from "@/components/demandes/NouvelleDemandeForm";

export default async function MesDemandesPage() {
  const session = await getSession();
  const creneaux = MOCK_CRENEAUX.filter((c) => c.enseignant.id === session?.enseignantId);
  const demandes = MOCK_DEMANDES.filter((d) => d.enseignant.id === session?.enseignantId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-xl font-bold text-text">Mes demandes</h1>
        <div className="flex flex-col gap-3">
          {demandes.length === 0 ? (
            <p className="text-sm text-text-muted">Aucune demande en cours.</p>
          ) : (
            demandes.map((demande) => {
              const creneau = MOCK_CRENEAUX.find((c) => c.id === demande.creneauConcerne);
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
        <NouvelleDemandeForm creneaux={creneaux} />
      </div>
    </div>
  );
}
