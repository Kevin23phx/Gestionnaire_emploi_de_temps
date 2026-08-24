import { apiFetchServer } from "@/lib/api-server";
import type { Creneau, DemandeEnseignant } from "@/lib/types";
import { DemandeValidationList } from "@/components/demandes/DemandeValidationList";

export default async function ValidationDemandesPage() {
  const [reponseDemandes, reponseCreneaux] = await Promise.all([
    apiFetchServer("/demandes"),
    apiFetchServer("/creneaux"),
  ]);
  const { demandes }: { demandes: DemandeEnseignant[] } = reponseDemandes.ok
    ? await reponseDemandes.json()
    : { demandes: [] };
  const { creneaux }: { creneaux: Creneau[] } = reponseCreneaux.ok
    ? await reponseCreneaux.json()
    : { creneaux: [] };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Validation des Demandes Enseignants</h1>
        <p className="text-sm text-text-muted">
          Gérez les demandes de report, d&apos;absence et de permutation du corps professoral.
        </p>
      </div>
      <DemandeValidationList demandesInitiales={demandes} creneaux={creneaux} />
    </div>
  );
}
