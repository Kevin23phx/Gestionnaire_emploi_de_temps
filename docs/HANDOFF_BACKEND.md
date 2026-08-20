# Handoff Backend — Fonctionnalités ajoutées côté frontend

Ce document résume les fonctionnalités ajoutées ou modifiées côté frontend
depuis la dernière prise de contact, pour que le backend sache exactement quoi
reproduire/prévoir côté API. Il complète (ne remplace pas) les documents
d'ingénierie numérotés (`01_PRD_...` → `05_UML_C4_...`) et la section
["Connu comme non fini"](../README.md#connu-comme-non-fini-prochaines-étapes-frontend)
du README, qui reste la référence pour l'état général du projet.

Les sections 1, 2, 3, 4 et 6 s'appuient sur les endpoints mock existants —
c'est leur comportement, pas leur contrat, qui a changé côté frontend. La
section 5 introduit en revanche une **nouvelle entité et deux nouvelles
routes** — voir le détail plus bas. La section 6 signale aussi une
**implication RBAC à anticiper côté vraie API**, pas seulement un détail
frontend.

---

## 1. Recherche de cours dans le formulaire de créneau

**Fichier :** `src/components/planning/CreneauFormModal.tsx`

**Problème :** le champ "Unité d'enseignement" était un `<select>` HTML natif.
Avec plusieurs filières et des centaines de cours au niveau du campus, défiler
une liste aussi longue pour trouver un cours n'est pas praticable.

**Ce qui a changé :** le `<select>` est remplacé par un champ de recherche
texte (filtre en direct sur le code **ou** l'intitulé, ex. "INFO303" ou
"Réseaux") + une liste filtrée qui défile dans sa propre zone (`max-h-48
overflow-y-auto`) sans faire bouger le reste du formulaire. La recherche est
**insensible aux accents** (normalisation Unicode NFD) : taper "reseaux" sans
accent trouve bien "Réseaux I" — comportement volontaire, la saisie rapide
sans accents est fréquente. Le cours actuellement sélectionné reste toujours
affiché au-dessus du champ, même si la recherche en cours ne le fait plus
apparaître dans la liste.

**Pour le backend :** aucun changement de contrat — `POST /api/cours`
(création à la volée via "+ Autre (préciser)") et la liste des UE
(`GET /api/cours`) sont utilisés tels quels. **Point de vigilance pour la
vraie API :** si le référentiel de cours grossit vraiment à plusieurs
centaines d'entrées, un filtrage 100% client (comme ici) reste correct tant
que `GET /api/cours` renvoie la liste complète d'un coup ; si vous introduisez
une pagination côté API un jour, il faudra soit un endpoint de recherche
serveur (`GET /api/cours?q=...`), soit garder le chargement complet côté
client si le volume le permet encore.

---

## 2. Défilement indépendant du panneau d'alertes

**Fichiers :** `src/components/conflicts/ConflictPanel.tsx`,
`src/app/scolarite/planning/[groupeId]/page.tsx`

**Problème :** le panneau "Alertes de Conflit" (colonne de droite) n'avait pas
de hauteur limitée ; avec beaucoup de conflits, défiler dans la liste des
alertes faisait défiler toute la page, y compris la grille du programme.

**Ce qui a changé :** le panneau a maintenant une hauteur maximale
(`max-h-[calc(100vh-4rem)]`), la liste des conflits défile en interne
(`overflow-y-auto`) et la colonne entière est `sticky` (à partir du
breakpoint `xl`) pour rester visible pendant qu'on parcourt la grille.
Purement visuel — **aucun impact sur le contrat de données.**

---

## 3. Correction groupée des avertissements de conflit

**Fichiers :** `src/components/conflicts/ConflictPanel.tsx`,
`src/app/scolarite/planning/[groupeId]/page.tsx`

**Problème :** créer un seul cours répété sur plusieurs jours dans une salle
trop petite pour le groupe génère **un avertissement de capacité par séance**
(`FR-CONF-04` s'applique séance par séance, cf.
`src/lib/conflict-detection.ts`). Corriger 5 ou 6 avertissements identiques un
par un, en rouvrant le formulaire d'édition à chaque fois, est redondant.

**Ce qui a changé — `ConflictPanel` :**
- Chaque carte d'alerte a maintenant une case à cocher ; "Tout
  sélectionner"/"Tout désélectionner" en haut de la liste.
- Une barre d'actions apparaît dès qu'au moins une alerte est sélectionnée :
  - **"Ignorer la sélection"** : masque toutes les cartes sélectionnées en un
    clic (même mécanisme que le bouton "Ignorer"/"Valider malgré tout"
    existant, juste appliqué à plusieurs cartes — reste un masquage local,
    pas une dérogation tracée, cf. limite déjà documentée dans le README).
  - **"Appliquer à la sélection"** (réaffectation de salle) : n'apparaît que
    si **toutes** les alertes sélectionnées sont du type `capacite`. C'est une
    restriction volontaire : un avertissement de capacité ne concerne qu'un
    seul créneau (fix uniforme et sûr = changer sa salle), alors qu'un conflit
    bloquant (`salle`/`enseignant`/`groupe`) lie deux créneaux distincts — il
    n'y a pas de correction "à l'identique" applicable aux deux à la fois, ça
    reste donc individuel via "Corriger".
  - Le sélecteur de salle proposé est **filtré aux salles dont la capacité
    suffit** pour le plus grand effectif parmi les créneaux sélectionnés
    (évite de recréer le même problème). Un motif texte est obligatoire avant
    de pouvoir appliquer (cohérent avec `FR-EDT-02`/`FR-CONF-08` : motif
    obligatoire pour toute modification).

**Ce qui a changé — page `planning/[groupeId]` :** nouvelle fonction
`handleCorrectionMasse(creneauxModifies, motif)`, symétrique de `handleSave`
existant : elle journalise une entrée d'audit par créneau modifié (même
pattern que la création/modification individuelle), puis envoie **un seul**
`POST /api/creneaux` avec le tableau complet des créneaux corrigés (l'endpoint
acceptait déjà un lot, aucun changement de contrat nécessaire).

**Pour le backend :**
- **Aucune nouvelle route.** `POST /api/creneaux` doit continuer à accepter un
  tableau de créneaux et les traiter comme un lot atomique (idéalement une
  transaction côté vraie base — ici c'est une simple boucle en mémoire).
- **Optimisation à considérer côté vraie API** (repérée en construisant cette
  fonctionnalité, pas encore appliquée côté frontend) : `journaliser()` fait
  un `POST /api/audit` **séquentiel par créneau** — pour une correction
  groupée de 6 créneaux, ça fait 6 requêtes au lieu d'une. Si vous construisez
  le vrai `AuditModule`, prévoir un endpoint qui accepte un lot d'entrées
  (`POST /api/audit` avec un tableau), sur le même principe que
  `/api/creneaux` — le frontend pourra être adapté pour n'envoyer qu'une seule
  requête par action groupée.
- La validation de capacité (filtrage des salles éligibles) est refaite
  côté client ici, à titre de garde-fou UX. **La version qui fait foi doit
  être recalculée côté `ConflictEngineModule`** (déjà noté dans le README pour
  `conflict-detection.ts` en général) — ne pas faire confiance à la salle
  choisie côté client sans revalider `capacite >= effectif` côté serveur.

---

## 4. Vue agenda pour mobile (emploi du temps)

**Fichiers :** `src/components/schedule/ScheduleWeekGrid.tsx`, et par
ricochet `src/app/etudiant/page.tsx`, `src/app/enseignant/page.tsx`,
`src/app/scolarite/planning/[groupeId]/page.tsx`.

**Problème :** la grille des 6 jours force chaque colonne à 96px minimum. Sur
téléphone (cf. §1.4 du cahier des charges : la majorité des utilisateurs
consultent Campus Manager depuis un smartphone), ça donne une grille qui
déborde horizontalement et des cartes de créneau où le titre du cours, la
salle et l'enseignant sont tous tronqués en "…" — vérifié en se connectant
soi-même avec un viewport de téléphone (retour utilisateur du 2026-08-18).

**Ce qui a changé :** `ScheduleWeekGrid` affiche maintenant deux présentations
distinctes selon la largeur d'écran (breakpoint `md`, cohérent avec le reste
de l'appli, cf. `AppShell.tsx`) :
- **< md (mobile) :** un agenda d'un seul jour à la fois — onglets Lun→Sam
  (un point indique les jours qui ont des cours), cartes pleine largeur, rien
  de tronqué. Le jour du jour courant est sélectionné par défaut.
- **≥ md (tablette/bureau) :** la grille des 6 jours, inchangée.

**Détail d'implémentation qui a un effet de bord sur le contrat de props** :
l'agenda mobile a besoin d'un `useState` (onglet sélectionné), donc
`ScheduleWeekGrid` est devenu un Client Component (`"use client"`). Or
`etudiant/page.tsx` et `enseignant/page.tsx` sont des Server Components (ils
lisent la session via `getSession()`/`next/headers`) qui lui passaient une
**fonction** `renderMeta={(c) => ...}` — impossible dès qu'on traverse une
frontière Server → Client Component (une fonction n'est pas sérialisable).
Remplacé par une prop `variante: "salle-enseignant" | "salle-groupe"`
(chaîne, donc sérialisable) ; le composant construit le texte lui-même en
interne. **Pour le backend, aucun impact** — c'est un détail de rendu React
pur — mais si vous ajoutez un jour un troisième format d'affichage
(`renderMeta`), il faudra soit l'ajouter à `VarianteMeta`, soit repasser par
un Server Component parent qui construit la chaîne côté serveur.

---

## 5. Référentiel des étudiants et affectation aux groupes

**Fichiers :** `src/lib/types.ts` (type `Etudiant`), `src/lib/mock-data.ts`
(`MOCK_ETUDIANTS`, `recalculerEffectif`), `src/app/api/etudiants/route.ts`
**(nouvelle route)**, `src/app/api/etudiants/affecter/route.ts` **(nouvelle
route)**, `src/components/groupes/GroupeEtudiantsModal.tsx` **(nouveau)**,
`src/components/groupes/GroupeFormModal.tsx`, `src/app/scolarite/groupes/page.tsx`.

**Problème :** la création d'un groupe ne demandait qu'un "Effectif" —un
nombre tapé à la main, jamais relié à de vrais étudiants. Aucun mécanisme
n'existait pour rattacher un étudiant à un groupe, et le repeupler un par un
n'est pas réaliste à l'échelle d'un campus (retour utilisateur du
2026-08-18).

**Décision de conception — import/affectation plutôt que jointure live** :
l'idée de départ était de "lier" Campus Manager à la base étudiante centrale
du campus. On a préféré un mécanisme d'**import qui copie** les données
utiles plutôt qu'une jointure en direct sur une base tierce, pour trois
raisons : (1) couplage — un changement de schéma côté système central ne doit
pas pouvoir casser Campus Manager ; (2) sécurité — un accès direct à une base
tierce contenant des données de milliers d'étudiants est un risque à ne pas
improviser sans revue ; (3) traçabilité — un import laisse une trace claire
de qui a rattaché qui, une jointure live n'en laisse aucune. **Le contrat
frontend reste le même que la source soit un copier-coller manuel
aujourd'hui ou une synchronisation nocturne automatisée avec le système
central demain** — c'est un détail d'implémentation côté backend, pas
quelque chose que l'écran a besoin de connaître.

**Nouveau type (`types.ts`) :**
```ts
export interface Etudiant {
  id: string;
  ine: string; // Identifiant National de l'Étudiant — pas "matricule" (retour utilisateur du 2026-08-18)
  nom: string;
  prenom: string;
  filiere: string;
  niveau: string;
  groupeId?: string; // absent = connu du référentiel, pas encore affecté
}
```
Distinct de `Utilisateur` (compte de connexion), pour la même raison
qu'`Enseignant` en est distinct : la scolarité doit pouvoir importer/rattacher
un étudiant à un groupe avant même que son compte de connexion existe (le
compte, avec activation par l'étudiant lui-même, reste un sujet séparé —
non traité ici, cf. le provisionnement enseignant déjà en place comme
référence).

**`Groupe.effectif` change de sens** : ce n'est plus un champ saisi à la
création (`GroupeFormModal` ne le demande plus, un groupe naît à 0), mais un
**dérivé** recalculé à chaque changement de rattachement
(`recalculerEffectif(groupeId)` dans `mock-data.ts`, appelée par les deux
routes ci-dessous). **Pour la vraie API : ce doit être soit une colonne
recalculée à l'écriture, soit — mieux — une vue/agrégat SQL
(`COUNT(etudiants) WHERE groupe_id = ...)`), jamais une valeur libre modifiable
indépendamment des étudiants réellement rattachés.**

**Nouvelles routes :**
- `GET /api/etudiants` — liste complète (utilisée pour la recherche
  d'étudiants "déjà connus" à affecter).
- `POST /api/etudiants` — import en lot : `{ etudiants: [{ine, nom,
  prenom, filiere, niveau}], groupeId?: string }`. Rejette les INE déjà
  connus (retournés dans `doublons`, pas une erreur bloquante — les lignes
  valides du lot sont quand même importées) et les lignes incomplètes
  (`invalides`). Si `groupeId` est fourni, les étudiants créés sont affectés
  directement (import + affectation en une seule action, cf. UI ci-dessous).
- `POST /api/etudiants/affecter` — affectation en lot d'étudiants **déjà
  existants** : `{ etudiantIds: string[], groupeId: string | null }`
  (`null` = retirer du groupe). Recalcule l'effectif de tous les groupes
  concernés (ancien **et** nouveau groupe, en cas de transfert).

**UI (`GroupeEtudiantsModal`, ouverte via le bouton "Étudiants" de chaque
ligne du tableau `/scolarite/groupes`, et automatiquement à la création d'un
groupe) :** trois blocs — liste des membres actuels (avec retrait
individuel), recherche + sélection multiple (avec "Tout sélectionner"/"Tout
désélectionner") + affectation groupée des étudiants déjà connus du
référentiel (checkbox, même pattern que la correction groupée de conflits —
cf. section 3, pour la cohérence des interactions dans toute l'appli), et un
import en collant du texte (`INE, nom, prénom`, une ligne par étudiant,
séparateur virgule ou tabulation — accepte un copier-coller direct depuis un
tableur).

**Pour le backend :**
- Les deux routes ci-dessus sont le contrat à reproduire côté
  `ReferentielModule` (ou équivalent) : import en lot avec rapport de
  doublons/invalides, et affectation en lot avec recalcul d'effectif.
- **Aucune contrainte d'unicité de `ine` n'existe niveau base
  actuellement (mock)** — la vraie API doit imposer une contrainte unique sur
  ce champ (c'est déjà vérifié côté route mock, mais seulement en mémoire).
- Le compte de connexion étudiant (`Utilisateur`/démo `20230145`) et le
  référentiel `Etudiant` (même INE) **ne sont pas reliés
  automatiquement** dans ce mock — les deux jeux de données mock ont été
  alignés à la main pour la démo, mais rien ne les synchronise en code. À la
  vraie API, il faudra probablement une relation explicite (`Utilisateur.
  etudiantId`, sur le même modèle que `Utilisateur.enseignantId`).

---

## 6. Formulaire de créneau : messages d'erreur explicites + groupe verrouillé

**Fichiers :** `src/components/planning/CreneauFormModal.tsx`,
`src/components/conflicts/ConflictPanel.tsx`.

Deux correctifs trouvés en testant les fonctionnalités ci-dessus en conditions
réelles (pas des demandes initiales, mais des bugs bloquants découverts et
corrigés pendant cette session) — à connaître car ils révèlent des
comportements que la vraie API devra respecter aussi.

**6a. Le bouton "Enregistrer"/"Appliquer" ne disait jamais pourquoi il était
désactivé.** Un utilisateur qui oubliait un champ obligatoire (motif, jour
coché, salle choisie...) voyait juste un bouton grisé, sans indication. Les
deux formulaires (`CreneauFormModal`, `ConflictPanel`) ont été changés pour
que le bouton reste **toujours cliquable** (sauf pendant l'envoi) ; au clic,
si une condition manque, un message rouge précis apparaît (ex.
"Sélectionnez au moins un jour.", "Le motif de la modification est
obligatoire."). **Piège rencontré en corrigeant ça** : `aria-disabled="true"`
sur le bouton (au lieu de `disabled`) semblait une bonne idée pour garder un
style "désactivé" tout en restant cliquable, mais les technologies
d'assistance ET les outils de test (Playwright) traitent `aria-disabled`
comme un vrai blocage — à éviter, préférer une classe de couleur neutre pour
l'indication visuelle. **Aucun impact côté contrat API**, purement une
question de retour utilisateur côté formulaire.

**6b. Bug réel : corriger un conflit inter-groupes plantait le formulaire.**
Quand un conflit oppose deux créneaux de **groupes différents** (ex. une
salle réservée en double par le groupe L3 et le groupe L2), le bouton
"Corriger" du panneau d'alertes peut ouvrir en édition le créneau de
**n'importe lequel des deux groupes** — pas forcément celui de la page
"programme" actuellement affichée. Le champ "Groupe" du formulaire était un
`<select>` limité au seul groupe de la page courante (`groupes={[groupeActuel]}`,
un "programme" = un seul groupe, décision de cadrage du 2026-08-17) : si le
créneau à corriger appartenait à l'**autre** groupe, il ne se trouvait jamais
dans cette liste verrouillée, et le formulaire restait bloqué sur
"Sélectionnez un groupe" sans qu'aucune action ne le débloque.

**Correctif :** le champ "Groupe" n'est plus un `<select>` du tout — c'est un
texte figé qui reflète toujours le **vrai** groupe du créneau en cours
d'édition (`creneau?.groupe ?? groupes[0]`, jamais une recherche dans la
liste verrouillée de la page). L'utilisateur n'a plus jamais à "choisir" un
groupe dans ce formulaire, en création comme en édition.

**Pour le backend — implication RBAC à anticiper :** ce correctif confirme
qu'une action légitime de la scolarité ("corriger un conflit") peut nécessiter
de modifier un créneau **en dehors du groupe affiché à l'écran**. Le futur
`RBAC Guard` (cf. `04_Exigence_Architecture_Campus_Manager.md`) ne doit donc
pas restreindre `PUT/PATCH /creneaux/:id` au seul groupe visible côté client
— l'autorisation doit rester "scolarité de l'UFR pilote peut modifier
n'importe quel créneau de l'UFR", pas "scolarité peut modifier seulement les
créneaux du groupe actuellement ouvert".

---

## Rappel — écart connu qui reste entier : notifications temps réel

Sans lien avec les trois points ci-dessus, mais posé comme question pendant
cette session et qui mérite d'être répété ici pour la priorisation backend :
**`FR-NOTIF-01` / `INV-06`** ("toute création/modification/annulation de
créneau doit déclencher une notification immédiate vers le groupe et
l'enseignant concernés") **n'est pas implémenté**, ni côté frontend ni
backend :

- `handleSave` / `handleCorrectionMasse` (page planning) journalisent l'audit
  et enregistrent le créneau, mais n'envoient **aucune** notification.
- `/etudiant/notifications` est une page 100% statique
  (`MOCK_NOTIFICATIONS`), non branchée sur les vrais créneaux.
- `public/sw.js` n'a aucun gestionnaire d'événement `push`.

C'est attendu à ce stade (`NotificationModule` NestJS + `LISTEN/NOTIFY`
PostgreSQL + Service Worker, cf.
[`04_Exigence_Architecture_Campus_Manager.md`](04_Exigence_Architecture_Campus_Manager.md)),
mais c'est le morceau backend le plus structurant qui reste à construire —
à garder en tête pour la priorisation.
