"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * [V8.2, 2026-09-22] Entrée discrète vers l'espace de connexion.
 *
 * ## Ce qui change
 *
 * La racine du site portait un bouton « Espace gestionnaire » en haut à
 * droite. Il désignait en clair, sur la page la plus consultée du système,
 * l'existence d'un espace authentifié et l'adresse exacte pour y frapper.
 * Demande du chef de projet : le faire disparaître, et déclencher l'accès
 * par un **double-clic sur le logo de l'université**.
 *
 * C'est la suite logique de ce qui a été fait en V8 pour l'espace Admin
 * (src/lib/espace-admin.ts) : là on avait retiré l'adresse des balayages
 * automatisés, ici on retire l'invitation de la vue des dizaines de
 * milliers de visiteurs qui n'ont rien à y faire. Les deux relèvent de la
 * même logique — réduire la surface offerte — et des mêmes limites :
 * **ce n'est pas un contrôle d'accès** (cf. INT-12). `/connexion` reste
 * une adresse publique, et le seul verrou réel demeure le RBAC serveur.
 *
 * ## Pourquoi le logo, et pourquoi un double-clic
 *
 * Le logo est le seul élément de l'en-tête qui soit à la fois toujours
 * présent, toujours au même endroit, et dépourvu de fonction — donc
 * mémorisable par les dix personnes concernées sans rien signaler aux
 * autres. Le double-clic évite qu'un visiteur l'atteigne par hasard : un
 * clic simple sur un logo est un geste courant (on s'attend à revenir à
 * l'accueil), un double-clic ne l'est pas.
 *
 * ## Ce que ça coûte, et pourquoi c'est acceptable
 *
 * Un déclencheur au double-clic n'est atteignable ni au clavier ni par un
 * lecteur d'écran, et ce composant n'expose donc DÉLIBÉRÉMENT aucun
 * `role`, `tabIndex` ni `aria-label` : les poser annoncerait aux
 * technologies d'assistance l'existence même de ce qu'on dissimule, ce qui
 * annulerait la mesure sans rendre service à personne.
 *
 * Le chemin fiable reste donc l'adresse `/connexion`, que les
 * gestionnaires connaissent déjà — c'est celle qu'ils utilisent tous les
 * jours et qu'ils peuvent mettre en favori. Le double-clic est un
 * raccourci, jamais le seul accès : c'est ce qui permet de le rendre
 * invisible sans exclure personne.
 */
export function EntreeGestionnaire() {
  const router = useRouter();

  return (
    <Image
      src="/logo-universite.png"
      alt="Université Joseph Ki-Zerbo"
      width={36}
      height={36}
      priority
      onDoubleClick={() => router.push("/connexion")}
      // `select-none` : sans lui, le double-clic sélectionne le texte voisin
      // et laisse un surlignage bleu en travers de l'en-tête au moment même
      // où la navigation part — l'utilisateur voit un artefact sans savoir
      // s'il a réussi ou raté son geste.
      //
      // Pas de `cursor-pointer` ni de `title` : l'un comme l'autre
      // signaleraient au survol qu'il y a quelque chose ici, ce qui est
      // exactement ce qu'on évite.
      className="h-9 w-9 shrink-0 select-none object-contain"
    />
  );
}
