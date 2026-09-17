"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { normaliser } from "./recherche";

/**
 * [V3] FR-FILT-05 — l'état des filtres vit dans l'URL.
 *
 * Ce n'est pas un raffinement : un Gestionnaire qui ouvre une fiche puis
 * revient en arrière retrouve sa liste filtrée, et il peut transmettre une
 * vue à un collègue par simple copie du lien. Un `useState` local perdrait
 * les deux.
 *
 * `router.replace` et non `push` : filtrer n'est pas naviguer. Empiler une
 * entrée d'historique par caractère tapé rendrait le bouton « retour »
 * inutilisable.
 */
export function useFiltresUrl(): {
  valeur: (cle: string) => string;
  toutes: () => Record<string, string>;
  definir: (cle: string, valeur: string) => void;
  definirPlusieurs: (entrees: [string, string][]) => void;
  reinitialiser: () => void;
  actifs: number;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const valeur = useCallback((cle: string) => searchParams.get(cle) ?? "", [searchParams]);

  const toutes = useCallback(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  // Applique plusieurs changements en une seule navigation. Indispensable
  // pour un commit à plusieurs clés à la fois (cf. useFiltresManuel) :
  // `searchParams` ne se met à jour qu'au prochain rendu, donc plusieurs
  // appels successifs à `definir()` dans la même passe partiraient tous du
  // même instantané et s'écraseraient l'un l'autre au lieu de s'accumuler.
  const definirPlusieurs = useCallback(
    (entrees: [string, string][]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [cle, nouvelle] of entrees) {
        // Un filtre vidé disparaît de l'URL plutôt que d'y laisser un `?q=` :
        // l'adresse reste lisible et partageable.
        if (nouvelle) params.set(cle, nouvelle);
        else params.delete(cle);
      }
      const requete = params.toString();
      router.replace(requete ? `${pathname}?${requete}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const definir = useCallback((cle: string, nouvelle: string) => definirPlusieurs([[cle, nouvelle]]), [definirPlusieurs]);

  const reinitialiser = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const actifs = useMemo(() => [...searchParams.keys()].length, [searchParams]);

  return { valeur, toutes, definir, definirPlusieurs, reinitialiser, actifs };
}

/**
 * [2026-09] Retour des gestionnaires post-présentation : partout où un
 * écran affichait tout le référentiel dès l'ouverture, il doit désormais
 * attendre un clic explicite sur "Actualiser" avant de charger quoi que ce
 * soit — l'optimisation demandée porte sur le chargement, pas seulement sur
 * l'affichage.
 *
 * Enveloppe `useFiltresUrl` : les contrôles se lient à un "brouillon" local
 * (jamais écrit dans l'URL, jamais utilisé pour filtrer) et `actualiser()`
 * le fait passer dans l'état committé — celui que `valeur()` expose et que
 * l'URL retient. `aActualise` démarre à `true` si l'URL portait déjà des
 * filtres au montage (lien partagé, retour arrière) : on ne fait pas
 * revivre le geste à quelqu'un qui l'a déjà fait.
 */
export function useFiltresManuel(): {
  brouillon: (cle: string) => string;
  definirBrouillon: (cle: string, valeur: string) => void;
  valeur: (cle: string) => string;
  actualiser: () => void;
  reinitialiser: () => void;
  actifs: number;
  aActualise: boolean;
} {
  const { valeur: valeurUrl, toutes, definirPlusieurs, reinitialiser: reinitialiserUrl, actifs } = useFiltresUrl();
  const [brouillonState, setBrouillonState] = useState<Record<string, string>>({});
  // [2026-09] Les filtres committés, tenus EN LOCAL dès le clic.
  //
  // Cause du défaut corrigé ici : `router.replace` est une transition
  // asynchrone, alors que `aActualise` bascule, lui, dans le même rendu que
  // le clic. L'écran partait donc chercher ses données et les affichait
  // pendant que `searchParams` renvoyait encore l'URL d'avant — c'est-à-dire
  // en filtrant sur une valeur vide. Résultat visible à l'œil nu : tout le
  // référentiel s'affichait une fraction de seconde, puis se réduisait au
  // filtre demandé une fois la navigation arrivée.
  //
  // `null` tant qu'on n'a rien committé sur cet écran : l'URL reste alors la
  // source (lien partagé, retour depuis une fiche). Après le premier clic,
  // c'est cette table qui fait foi et l'URL n'en est plus que le miroir —
  // écrit pour rester partageable, jamais relu.
  const [committe, setCommitte] = useState<Record<string, string> | null>(null);
  const [aActualise, setAActualise] = useState(() => actifs > 0);

  const valeur = useCallback(
    (cle: string) => (committe ? (committe[cle] ?? "") : valeurUrl(cle)),
    [committe, valeurUrl]
  );

  const brouillon = useCallback(
    (cle: string) => (cle in brouillonState ? brouillonState[cle] : valeur(cle)),
    [brouillonState, valeur]
  );

  const definirBrouillon = useCallback((cle: string, nouvelle: string) => {
    setBrouillonState((prev) => ({ ...prev, [cle]: nouvelle }));
  }, []);

  const actualiser = useCallback(() => {
    // Committé localement AVANT la navigation : c'est ce qui garantit que la
    // requête déclenchée juste après part déjà avec le bon filtre. Au premier
    // clic, les filtres déjà portés par l'URL servent de base — sinon ouvrir
    // un lien filtré puis n'ajuster qu'un seul menu effacerait les autres.
    setCommitte((prev) => ({ ...(prev ?? toutes()), ...brouillonState }));
    // Une seule navigation pour tous les changements en attente : les
    // appliquer un par un partirait chaque fois du même instantané de l'URL
    // et s'écraserait mutuellement (cf. définirPlusieurs).
    definirPlusieurs(Object.entries(brouillonState));
    setBrouillonState({});
    setAActualise(true);
  }, [brouillonState, definirPlusieurs, toutes]);

  const reinitialiser = useCallback(() => {
    setBrouillonState({});
    setCommitte(null);
    setAActualise(false);
    reinitialiserUrl();
  }, [reinitialiserUrl]);

  return { brouillon, definirBrouillon, valeur, actualiser, reinitialiser, actifs, aActualise };
}

/**
 * FR-FILT-02 — filtrage texte insensible à la casse ET aux accents.
 *
 * Le pendant client de `unaccent` côté serveur (voir planning/services.py) :
 * les deux doivent se comporter pareil, sans quoi « reseaux » trouverait un
 * cours dans un écran et pas dans l'autre.
 */
export function correspond(recherche: string, ...champs: (string | null | undefined)[]): boolean {
  if (!recherche.trim()) return true;
  const terme = normaliser(recherche.trim());
  return champs.some((champ) => champ && normaliser(champ).includes(terme));
}

/** Valeurs distinctes d'un champ, pour alimenter un menu de filtre. */
export function valeursDistinctes<T>(elements: T[], extraire: (element: T) => string): string[] {
  return [...new Set(elements.map(extraire).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
}
