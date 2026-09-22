import Link from "next/link";
import { CalendarPlus, Star, WifiOff } from "lucide-react";
import { EntreeGestionnaire } from "@/components/layout/EntreeGestionnaire";
import { ListeFavoris } from "@/components/public/ListeFavoris";
import { RechercheProgramme } from "@/components/public/RechercheProgramme";

// [V3] La racine du site n'est plus une page de présentation avec un bouton
// « Se connecter » : c'est la recherche de programme elle-même (FR-PUB-01/02).
// C'est le cœur du changement demandé par les responsables UJKZ — l'étudiant
// vient chercher son emploi du temps, il n'a pas de compte et n'en aura pas.
// L'accès gestionnaire devient un lien discret, en haut à droite : il
// concerne une dizaine de personnes, contre des dizaines de milliers de
// visiteurs.

const ATOUTS = [
  {
    icon: Star,
    titre: "Gardez votre programme",
    description: "Mettez-le en favori : il vous attend sur cette page, sans avoir à refaire la recherche.",
  },
  {
    icon: CalendarPlus,
    titre: "Recevez-le dans votre agenda",
    description:
      "Ajoutez-le une fois à l'agenda de votre téléphone : annulations et changements de salle y arrivent ensuite tout seuls.",
  },
  {
    icon: WifiOff,
    titre: "Consultable hors connexion",
    description: "Le dernier programme consulté reste lisible même sans réseau.",
  },
];

export default function AccueilPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {/* [V8.2] Le logo EST l'entrée vers l'espace de connexion, par
              double-clic — voir EntreeGestionnaire pour le pourquoi et les
              limites. Rien ne le signale, c'est l'objet même du changement. */}
          <EntreeGestionnaire />
          <span className="truncate text-lg font-bold text-brand">Campus Manager</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <h1 className="max-w-2xl text-center text-2xl font-bold text-text sm:text-3xl">
          Trouvez votre emploi du temps
        </h1>
        <p className="mt-3 max-w-xl text-center text-text-muted">
          Tous les programmes de l&apos;Université Joseph Ki-Zerbo, à jour, sans compte à créer.
        </p>

        <div className="mt-10 flex w-full flex-col items-center">
          <ListeFavoris />
          <RechercheProgramme />
        </div>

        <div className="mt-16 grid grid-cols-1 max-w-4xl gap-6 sm:grid-cols-3">
          {ATOUTS.map(({ icon: Icon, titre, description }) => (
            <div key={titre} className="flex flex-col rounded-xl border border-border bg-surface p-6 text-left">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-text">{titre}</h2>
              <p className="mt-1 text-sm text-text-muted">{description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-6 text-center text-xs text-text-subtle">
        <p>
          Campus Manager est un outil complémentaire à CampusFaso, dédié à la gestion des emplois du temps de
          l&apos;UJKZ.
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/aide" className="hover:text-brand hover:underline">
            Aide
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/aide#donnees" className="hover:text-brand hover:underline">
            Protection des données
          </Link>
        </div>
      </footer>
    </div>
  );
}
