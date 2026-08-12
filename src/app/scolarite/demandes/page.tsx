import { MOCK_CRENEAUX, MOCK_DEMANDES } from "@/lib/mock-data";
import { DemandeValidationList } from "@/components/demandes/DemandeValidationList";

export default function ValidationDemandesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Validation des Demandes Enseignants</h1>
        <p className="text-sm text-text-muted">
          Gérez les demandes de report, d&apos;absence et de permutation du corps professoral.
        </p>
      </div>
      <DemandeValidationList demandesInitiales={MOCK_DEMANDES} creneaux={MOCK_CRENEAUX} />
    </div>
  );
}
