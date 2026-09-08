"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ActionsProgramme } from "@/components/public/ActionsProgramme";
import { ProgrammeSemaine } from "@/components/public/ProgrammeSemaine";
import { apiFetch } from "@/lib/api";
import type { ProgrammePublic } from "@/lib/types";

// [V3] FR-PUB-01/03 — le programme public d'un groupe.
//
// Client Component et non Server Component, à dessein : la semaine affichée
// est un état que le visiteur fait varier (FR-EDT-09), les favoris vivent
// dans son navigateur (FR-PUB-04) et l'abonnement aux alertes passe par le
// Service Worker (FR-PUB-08) — trois choses qui n'existent que côté client.
export default function ProgrammePage() {
  // `useParams()` et non `use(props.params)` : c'est la convention déjà en
  // place dans ce projet pour une page dynamique côté client
  // (cf. scolarite/planning/[groupeId]).
  const { groupeId } = useParams<{ groupeId: string }>();
  const [programme, setProgramme] = useState<ProgrammePublic | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [semaine, setSemaine] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  // Le chargement vit dans l'effet, avec un drapeau d'annulation. Ce n'est
  // pas de la prudence gratuite : en cliquant deux fois sur « semaine
  // suivante », la réponse de la première requête peut arriver après celle
  // de la seconde et réafficher la mauvaise semaine. Le drapeau garantit que
  // seule la dernière demande écrit dans l'état.
  useEffect(() => {
    let annule = false;
    const suffixe = semaine ? `?semaine=${encodeURIComponent(semaine)}` : "";

    apiFetch(`/public/programme/${groupeId}${suffixe}`)
      .then(async (reponse) => {
        if (annule) return;
        if (!reponse.ok) {
          const data = await reponse.json().catch(() => ({}));
          // ERR-08 : un favori qui pointe vers un groupe supprimé.
          if (!annule) setErreur(data.erreur ?? "Ce programme est introuvable.");
          return;
        }
        const data = await reponse.json();
        if (annule) return;
        setProgramme(data);
        setErreur(null);
      })
      .catch(() => {
        if (!annule) setErreur("Impossible de charger ce programme. Vérifiez votre connexion.");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [groupeId, semaine]);

  // Le passage en « chargement » accompagne le clic sur une flèche de
  // semaine, pas l'effet qui suit : c'est le geste de l'utilisateur qui
  // rend l'affichage courant périmé.
  function changerSemaine(lundi: string) {
    setChargement(true);
    setSemaine(lundi);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <Image
            src="/logo-universite.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="truncate text-sm font-bold text-brand">Campus Manager</span>
        </Link>
        <Link
          href="/connexion"
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-muted"
        >
          Espace gestionnaire
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {erreur ? (
          <div className="rounded-xl border border-status-danger/30 bg-status-danger-bg p-6 text-center">
            <p className="text-sm text-text">{erreur}</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Rechercher un programme
            </Link>
          </div>
        ) : !programme ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement du programme...
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-text">{programme.groupe.nom}</h1>
              <p className="text-sm text-text-muted">
                {programme.groupe.ufr.sigleAffiche} · {programme.groupe.filiere} ·{" "}
                {programme.groupe.niveau} · {programme.groupe.anneeAcademique}
              </p>
            </div>

            <div className="mb-5">
              <ActionsProgramme programme={programme} />
            </div>

            <div className={chargement ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <ProgrammeSemaine programme={programme} onSemaineChange={changerSemaine} />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border bg-surface px-6 py-4 text-center text-xs text-text-subtle">
        <Link href="/aide#donnees" className="hover:text-brand hover:underline">
          Protection des données
        </Link>
      </footer>
    </div>
  );
}
