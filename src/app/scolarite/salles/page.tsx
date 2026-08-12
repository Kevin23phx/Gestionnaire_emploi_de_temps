import { MOCK_SALLES } from "@/lib/mock-data";
import type { TypeUsageSalle } from "@/lib/types";

const USAGE_LABEL: Record<TypeUsageSalle, string> = {
  propre: "Propre à l'UFR",
  commune: "Commune",
  louee: "Louée",
  gratuite: "Gratuite",
};

export default function SallesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Salles</h1>
        {/* FR-REF-01 : import Excel/CSV à brancher sur l'API une fois disponible */}
        <p className="text-sm text-text-muted">
          Référentiel des salles de l&apos;UFR pilote — {MOCK_SALLES.length} salles.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-text-subtle">
              <th className="px-4 py-2 font-medium">Salle</th>
              <th className="px-4 py-2 font-medium">Bâtiment</th>
              <th className="px-4 py-2 font-medium">Capacité</th>
              <th className="px-4 py-2 font-medium">Gestionnaire</th>
              <th className="px-4 py-2 font-medium">Usage</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SALLES.map((salle) => (
              <tr key={salle.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-text">{salle.nom}</td>
                <td className="px-4 py-2 text-text-muted">{salle.batiment}</td>
                <td className="px-4 py-2 text-text-muted">{salle.capacite} pl.</td>
                <td className="px-4 py-2 text-text-muted">{salle.structureGestionnaire}</td>
                <td className="px-4 py-2 text-text-muted">{USAGE_LABEL[salle.typeUsage]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
