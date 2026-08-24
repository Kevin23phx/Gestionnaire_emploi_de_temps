import Image from "next/image";
import Link from "next/link";
import { Bell, Calendar, WifiOff } from "lucide-react";

const ATOUTS = [
  {
    icon: Calendar,
    titre: "Consultez votre planning en temps réel",
    description:
      "L'emploi du temps de votre groupe ou de vos cours, toujours à jour, où que vous soyez.",
  },
  {
    icon: Bell,
    titre: "Recevez une notification instantanée",
    description:
      "Annulation, changement de salle ou d'horaire : vous êtes informé en moins d'une minute.",
  },
  {
    icon: WifiOff,
    titre: "Accédez-y même hors-ligne",
    description:
      "La dernière version connue de votre emploi du temps reste consultable sans connexion.",
  },
];

export default function AccueilPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-universite.png"
            alt="Université Joseph Ki-Zerbo"
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-bold text-brand">Campus Manager</span>
        </div>
        <Link
          href="/connexion"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Se connecter
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16 text-center">
        <h1 className="max-w-2xl text-3xl font-bold text-text sm:text-4xl">
          La gestion en temps réel de votre emploi du temps universitaire
        </h1>
        <p className="mt-4 max-w-xl text-text-muted">
          Un outil dédié à l&apos;Université Joseph Ki-Zerbo pour éliminer les
          conflits de salle et les changements mal communiqués.
        </p>
        <Link
          href="/connexion"
          className="mt-8 rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Se connecter
        </Link>

        <div className="mt-16 grid max-w-4xl gap-6 sm:grid-cols-3">
          {ATOUTS.map(({ icon: Icon, titre, description }) => (
            <div
              key={titre}
              className="flex flex-col items-center rounded-xl border border-border bg-surface p-6 text-left"
            >
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
          Campus Manager est un outil complémentaire à CampusFaso, dédié à la
          gestion des emplois du temps de l&apos;UJKZ.
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
