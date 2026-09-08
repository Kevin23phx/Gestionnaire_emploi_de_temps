"use client";

import { useCallback, useMemo } from "react";
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
  definir: (cle: string, valeur: string) => void;
  reinitialiser: () => void;
  actifs: number;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const valeur = useCallback((cle: string) => searchParams.get(cle) ?? "", [searchParams]);

  const definir = useCallback(
    (cle: string, nouvelle: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Un filtre vidé disparaît de l'URL plutôt que d'y laisser un `?q=` :
      // l'adresse reste lisible et partageable.
      if (nouvelle) params.set(cle, nouvelle);
      else params.delete(cle);
      const requete = params.toString();
      router.replace(requete ? `${pathname}?${requete}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const reinitialiser = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const actifs = useMemo(() => [...searchParams.keys()].length, [searchParams]);

  return { valeur, definir, reinitialiser, actifs };
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
