"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, WifiOff } from "lucide-react";
import { ActionsProgramme } from "@/components/public/ActionsProgramme";
import { ProgrammeSemaine } from "@/components/public/ProgrammeSemaine";
import { apiFetch } from "@/lib/api";
import type { ProgrammePublic } from "@/lib/types";

// FR-OFF-01 — « Le dernier programme consulté reste lisible même sans
// réseau », promesse affichée sur la page d'accueil. Le Service Worker ne
// met délibérément aucune réponse d'API en cache (cf. public/sw.js, correctif
// du gel de septembre) : c'est donc cette page qui garde, sur l'appareil,
// chaque programme affiché avec succès, et le relit si le réseau manque.
// [V8.1] La spécialité entre dans la clé : un groupe unique sert désormais
// plusieurs programmes (cours communs + cours d'une spécialité). Sans elle,
// consulter la vue « Chimie » écraserait la copie hors ligne de la vue
// « Informatique », et l'étudiant d'Informatique privé de réseau se
// retrouverait avec l'emploi du temps de la Chimie — signalé comme étant
// le sien.
const CLE_HORS_LIGNE = (groupeId: string, specialite: string) =>
  `campus-manager:programme:${groupeId}${specialite ? `:${specialite}` : ""}`;

interface CopieHorsLigne {
  programme: ProgrammePublic;
  enregistreLe: string;
}

// try/catch partout : `localStorage` lève en navigation privée ou quand le
// stockage est plein — la copie hors ligne est un confort, jamais une
// raison de faire échouer l'affichage.
function memoriser(groupeId: string, specialite: string, programme: ProgrammePublic) {
  try {
    const copie: CopieHorsLigne = { programme, enregistreLe: new Date().toISOString() };
    localStorage.setItem(CLE_HORS_LIGNE(groupeId, specialite), JSON.stringify(copie));
  } catch {}
}

function relire(groupeId: string, specialite: string): CopieHorsLigne | null {
  try {
    const brut = localStorage.getItem(CLE_HORS_LIGNE(groupeId, specialite));
    return brut ? (JSON.parse(brut) as CopieHorsLigne) : null;
  } catch {
    return null;
  }
}

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
  // [V8.1] La spécialité choisie dans la cascade publique. Vide = le
  // programme complet du groupe, toutes spécialités confondues — ce qui
  // reste la lecture juste d'un niveau de tronc commun, et celle d'un
  // favori enregistré avant la réforme.
  const specialite = useSearchParams().get("specialite") ?? "";
  const [programme, setProgramme] = useState<ProgrammePublic | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [semaine, setSemaine] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  // Date d'enregistrement de la copie affichée quand le réseau manque ; null
  // quand ce qui est à l'écran vient bien du serveur.
  const [copieDu, setCopieDu] = useState<string | null>(null);

  // Le chargement vit dans l'effet, avec un drapeau d'annulation. Ce n'est
  // pas de la prudence gratuite : en cliquant deux fois sur « semaine
  // suivante », la réponse de la première requête peut arriver après celle
  // de la seconde et réafficher la mauvaise semaine. Le drapeau garantit que
  // seule la dernière demande écrit dans l'état.
  useEffect(() => {
    let annule = false;
    // [V8.1] La spécialité accompagne la demande : le serveur renvoie alors
    // les cours communs PLUS ceux de cette spécialité, jamais ceux des
    // autres (cf. `filtre_specialite` côté serveur).
    const params = new URLSearchParams();
    if (semaine) params.set("semaine", semaine);
    if (specialite) params.set("specialite", specialite);
    const requete = params.toString();
    const suffixe = requete ? `?${requete}` : "";

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
        setCopieDu(null);
        setErreur(null);
        memoriser(groupeId, specialite, data);
      })
      .catch(() => {
        if (annule) return;
        // Réseau absent : on ressert la dernière copie — mais seulement si
        // c'est bien la semaine demandée. Montrer une autre semaine que
        // celle réclamée, même signalée, ferait lire au visiteur le mauvais
        // programme.
        const copie = relire(groupeId, specialite);
        if (copie && (semaine === null || copie.programme.semaine.lundi === semaine)) {
          setProgramme(copie.programme);
          setCopieDu(copie.enregistreLe);
          setErreur(null);
          return;
        }
        setErreur("Impossible de charger ce programme. Vérifiez votre connexion.");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [groupeId, semaine, specialite]);

  // Le passage en « chargement » accompagne le clic sur une flèche de
  // semaine, pas l'effet qui suit : c'est le geste de l'utilisateur qui
  // rend l'affichage courant périmé.
  function changerSemaine(lundi: string) {
    setChargement(true);
    setSemaine(lundi);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
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
        {/* [V8.2, complété le 2026-09-23] Le bouton « Espace gestionnaire »
            a disparu d'ici aussi. Il avait été retiré de la page d'accueil
            mais oublié sur cette page-ci, qui est pourtant la plus visitée
            de tout le site — chaque étudiant consultant son emploi du temps
            y lisait donc encore, en clair, qu'un espace authentifié existe
            et où frapper (NFR-SEC-05).

            Pas de double-clic sur le logo ici, contrairement à l'accueil :
            ce logo est DÉJÀ un lien de retour à l'accueil, et deux gestes
            concurrents sur le même élément se marcheraient dessus — le
            simple clic partirait avant le second. L'entrée discrète reste
            donc à un seul endroit, la page d'accueil. */}
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
              {/* [V8] La spécialité s'insère entre le niveau et l'année, et
                  disparaît quand il n'y en a pas — un « · » orphelin en L1
                  laisserait croire à une information manquante. */}
              <p className="text-sm text-text-muted">
                {[
                  programme.groupe.ufr.sigleAffiche,
                  programme.groupe.departement,
                  programme.groupe.niveau,
                  // [V8.1] La spécialité CONSULTÉE : celle choisie dans la
                  // cascade, qui peut venir du créneau plutôt que du groupe.
                  programme.groupe.specialiteConsultee,
                  programme.groupe.anneeAcademique,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            {copieDu ? (
              // Toujours signalé : une copie peut avoir été dépassée par une
              // annulation publiée depuis — l'étudiant doit le savoir avant
              // de se déplacer.
              <p className="mb-5 flex items-start gap-2 rounded-lg bg-status-warning-bg px-3 py-2 text-sm text-text">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
                <span>
                  Hors connexion — programme enregistré sur cet appareil le{" "}
                  {new Date(copieDu).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}. Il a
                  pu changer depuis : vérifiez-le dès que le réseau revient.
                </span>
              </p>
            ) : null}

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
