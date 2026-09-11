# PRD — Campus Manager

**Étape 1 de la chaîne méthodologique** — répond à : *pourquoi ce système doit-il exister ?*
Ce document fige le **problème**. Il ne mentionne aucune solution technique — c'est le rôle du SRS et de l'architecture (documents suivants).

Sources : `Cahier_des_charges_Campus_Manager.md` (v2.1), décisions de cadrage prises le 2026-08-11, le 2026-08-27 et le 2026-09-07 (voir notes de cadrage en fin de document).

> **[V4] Note de cadrage (2026-09-09) : le programme est publié SEMAINE PAR SEMAINE.** Constat d'usage décisif, remonté par le porteur de projet après le premier abonnement à un agenda réel : à l'UJKZ, l'emploi du temps **n'est pas arrêté pour le semestre**. Il sort en fin de semaine (vendredi, samedi, au plus tard dimanche) pour la semaine à venir, et son contenu change d'une semaine à l'autre — cette semaine Mathématiques, la suivante Algorithmique. Le Gestionnaire, en concertation avec les enseignants, compose chaque semaine et la fait sortir. Toutes les versions précédentes reposaient sur l'hypothèse inverse (un créneau récurrent, fixé pour tout un semestre), héritée des universités à programme semestriel : elle produisait un cours répété à l'identique de la rentrée aux examens, **vacances comprises**. Décision : une séance est rattachée à une **date réelle**, il n'y a plus aucune récurrence. Trois choses disparaissent avec elle et c'est une simplification nette — les dates de période académique (plus rien à borner), le mécanisme d'annulation d'une occurrence (annuler la séance du 14 revient à annuler le créneau du 14), et la question des congés à exclure (une semaine sans cours est une semaine sans programme publié). Les jours de cours vont du **lundi au samedi** ; le dimanche est refusé à la saisie.

> **[V3.2] Note de cadrage (2026-09-07) : le périmètre passe de 5 UFR à 12 établissements.** Réception du référentiel officiel de l'UJKZ (établissement, sigle, libellé de département). Il en ressort que le périmètre « les 5 UFR » arrêté en V2 — qui excluait explicitement les instituts — ne correspond pas à la réalité de l'établissement : l'université compte **5 UFR, 6 instituts** (IBAM, ISSP, IFOAD, ISSDH, IGEDD, IPERMIC) **et 1 école doctorale** (EDICC), soit 12 établissements et **53 départements**. Décision : le périmètre couvre les 12, chacun avec son compte Gestionnaire. Deux conséquences : le vocabulaire visible par l'utilisateur passe d'« UFR » à « **établissement** » (demander « votre UFR » à un étudiant de l'IBAM n'a pas de sens, et c'est la première étape du parcours public) ; et les **départements deviennent un référentiel officiel** au lieu d'une liste déduite des groupes déjà saisis — une liste déduite ne peut que se dégrader, chaque faute de frappe y devenant une filière de plus. **Les intitulés de départements sont ceux du document de la scolarité, repris tels quels** : deux paires d'apparence redondante (« Philosophie -Psychologie » / « Pshychologie » à l'UFR/SH, « Médecine et Spécialités médicales » / « Medecine » à l'UFR/SDS) ont été soumises au responsable de la scolarité le 2026-09-07 et confirmées comme des **filières à part entière, aux contenus différents**. Le Système ne normalise donc jamais ces libellés de sa propre initiative.

> **[V3.1] Note de cadrage (2026-09-07, même journée) : le référentiel nominatif des étudiants est abandonné.** Retour du porteur de projet en cours d'implémentation : « je ne veux plus importer d'étudiants, juste un champ où insérer le nombre d'étudiants ». Constat sous-jacent : tenir à jour la liste nominative des inscrits de chaque groupe (import Excel, INE, affectations, promotions d'une année sur l'autre) représente un travail administratif considérable, alors que le système n'en consomme **qu'une seule valeur** — le nombre d'étudiants, comparé à la capacité d'une salle. Décision : la section Étudiants est supprimée, l'effectif d'un groupe devient un nombre saisi par le Gestionnaire. Corollaire : le transfert d'un étudiant d'une UFR à une autre (FR-ADMIN-05, décidé en V2) disparaît, faute d'objet. Dans le même mouvement, filière, niveau et année académique se **sélectionnent** dans des listes plutôt que de se saisir librement — trois orthographes d'une même filière créeraient trois entrées distinctes dans la recherche publique.

> **[V3] Note de cadrage (2026-09-07) : le programme devient public, l'audience cesse d'être une population de comptes.** Présentation faite aux responsables UJKZ : ils constatent que faire créer un compte à ~48 000 étudiants et à leurs enseignants pour *lire* un emploi du temps est une barrière disproportionnée par rapport au service rendu — un emploi du temps est déjà, dans les faits, une information affichée publiquement sur les tableaux des UFR. Décision : **le programme de toutes les UFR devient consultable publiquement, sans compte**, l'étudiant venant y chercher le sien ; **les rôles Étudiant et Enseignant disparaissent** en tant qu'utilisateurs du système (ils restent des *données* du référentiel : un créneau porte toujours un enseignant, un groupe a toujours un effectif) ; il ne reste que deux comptes, **Gestionnaire de scolarité** et **Admin**. Corollaire remonté par les responsables : le circuit de demande d'un enseignant sort du périmètre — « l'enseignant peut appeler pour ces genres de situation », le Gestionnaire corrige alors directement le programme, ce qui suffit à avertir les étudiants. Ce document et les 4 suivants sont annotés `[V3]` ; les passages devenus obsolètes sont marqués, pas supprimés.

> **Note de cadrage (2026-08-27) : passage à la V2 multi-UFR.** Le pilote sur une seule UFR ayant permis d'échanger avec le responsable côté UJKZ, il ressort que la gestion de plusieurs UFR par une seule scolarité centrale est structurellement intenable à l'échelle de l'UJKZ (~48 000 étudiants, 5 UFR). Décision : le périmètre du produit passe dès maintenant à une gestion **multi-UFR**, avec un compte **Admin** central qui supervise et un compte **Gestionnaire de scolarité** par UFR qui opère sur le périmètre de sa seule UFR. Ce document et les 4 suivants (`02`–`05`) sont mis à jour en conséquence ; les passages devenus obsolètes du cadrage MVP (§2, §4) sont marqués explicitement plutôt que supprimés silencieusement.

---

## 1. Problème

À l'Université Joseph Ki-Zerbo (UJKZ, ~47 950 étudiants), l'emploi du temps est géré de façon non centralisée et non temps réel :

- Les salles sont gérées séparément par chaque UFR, sans mécanisme automatique de détection des doubles réservations — un même créneau/salle peut être attribué à deux cours différents sans que personne ne le sache avant que les deux groupes ne se présentent physiquement.
- Un changement de dernière minute (annulation, changement de salle) est aujourd'hui communiqué par voie orale ou affichage papier. Le délai entre la décision et sa réception par l'étudiant ou l'enseignant concerné n'est pas maîtrisé — il peut dépasser plusieurs heures, voire ne jamais atteindre tout le monde.
- Les amphithéâtres construits pour l'effectif actuel sont sur-fréquentés (d'où la construction de 40 nouveaux amphithéâtres annoncée en 2025 dans le cadre de l'IPEQ) : des groupes sont parfois affectés à des salles dont la capacité est inférieure à leur effectif réel, sans qu'aucun contrôle ne le signale au moment de la planification.
- Aucune trace vérifiable des modifications d'emploi du temps n'existe aujourd'hui. Avec la réforme (reportée d'un an) qui prévoit d'exclure des examens les étudiants trop absentéistes, un étudiant absent à cause d'un changement mal communiqué n'a aujourd'hui aucun moyen de le prouver a posteriori.

Conséquence observable et documentée dans le cahier des charges : des cursus de licence prévus sur 3 ans qui en prennent parfois 5 à 6, en partie à cause de cette désorganisation administrative.

## 2. Utilisateurs cibles

Utilisateurs réels qui subissent le problème aujourd'hui (pas des personas marketing) :

- **L'étudiant** d'un groupe/filière d'une UFR de l'UJKZ, qui se déplace parfois pour un cours annulé ou déplacé faute d'avoir été informé à temps. *(**[V3]** — n'est plus un **utilisateur authentifié** mais un **visiteur public** : il consulte sans compte, en désignant son UFR, sa filière et son niveau, et peut conserver son programme en favori sur son propre appareil. C'est le changement d'audience central de la V3 : le système n'a plus à connaître ses étudiants pour les servir.)*
- ~~**L'enseignant**, rattaché à une ou plusieurs UE, qui doit signaler une absence ou un report et n'a aujourd'hui aucun canal structuré pour le faire ni pour savoir si sa demande a été prise en compte.~~ *(**[V3], 2026-09-07** — **retiré des utilisateurs du système**. L'enseignant reste une **donnée** du référentiel — un créneau lui est toujours rattaché, et son nom est affiché sur le programme public — mais il n'a plus de compte : il signale une absence ou un report **par téléphone** au Gestionnaire de sa scolarité, qui corrige le programme lui-même. Décision des responsables UJKZ, cf. note de cadrage 2026-09-07.)*
- **La scolarité de l'UFR** (désormais **Gestionnaire de scolarité d'UFR**), qui construit et corrige l'emploi du temps de sa propre UFR à la main, sans outil pour détecter automatiquement un conflit de salle, d'enseignant ou de capacité avant qu'il ne se produise sur le terrain.
- **L'Admin** *(nouveau, 2026-08-27 ; périmètre élargi le 2026-09-07)* : **`[V3.2]`** supervise les **12 établissements** (5 UFR, 6 instituts, 1 école doctorale), et non plus les seules 5 UFR. le porteur de projet côté UJKZ a remonté qu'un seul compte scolarité ne peut plus, à l'échelle de l'établissement (5 UFR, ~48 000 étudiants), gérer à la fois le référentiel/planning de chaque UFR et la supervision d'ensemble. L'Admin ne gère plus lui-même le référentiel ou le planning d'une UFR — il crée les UFR, y affecte un compte Gestionnaire, et supervise (lecture) l'activité de toutes les UFR.

> **Note de cadrage (2026-08-11, révisée 2026-08-27)** : le cahier des charges (§3) identifie deux acteurs supplémentaires — la DEP (structure intervenant sur les salles communes/louées) et le DSI (administration système). Le DSI reste **hors périmètre**. La **DEP entre dans le périmètre dès le 2026-08-27** : elle est modélisée comme une structure gestionnaire transversale de salles communes/louées (au même titre qu'une UFR pour le champ "structure gestionnaire" d'une salle), mais sans compte dédié pour l'instant — ses salles sont administrées par l'Admin en attendant qu'un référent DEP soit désigné côté UJKZ.

## 3. Cas d'usage principaux

Ce que l'utilisateur doit pouvoir faire (sans dire comment) :

1. **[V3]** N'importe qui — étudiant, enseignant, parent, agent — peut **retrouver un programme sans compte**, en désignant l'UFR, la filière puis le niveau concernés, et le consulter à tout moment, y compris sans connexion internet active.
2. **[V3]** Un étudiant peut **conserver son programme en favori** sur son appareil, pour y revenir directement sans refaire la recherche.
3. **[V3]** Un étudiant peut **rattacher son programme à son agenda personnel** (téléphone, Google Agenda, Outlook) une seule fois, et **recevoir automatiquement toutes les évolutions ultérieures** de ce programme sans rien faire de plus.
4. **[V3]** Un étudiant est informé, sans avoir à vérifier activement, dès qu'un cours de son groupe est annulé, déplacé ou changé de salle. *(Inchangé sur le fond ; ce qui change est le canal — l'agenda et une alerte optionnelle sur le favori, au lieu d'un compte à consulter.)*
5. ~~Un enseignant peut consulter son propre planning et signaler une indisponibilité ou demander un changement de créneau.~~ *(**[V3]** — retiré : plus de compte enseignant. Il consulte le programme public comme tout le monde, et signale une indisponibilité par téléphone au Gestionnaire.)*
6. La scolarité d'une UFR peut construire l'emploi du temps de son UFR et être alertée, au moment de la saisie, si elle crée un conflit (salle, enseignant, groupe, capacité).
7. ~~La scolarité peut valider ou refuser une demande d'un enseignant, et voir son planning se mettre à jour en conséquence.~~ *(**[V3]** — retiré avec le circuit de demandes. Le Gestionnaire applique directement la correction au programme, avec motif obligatoire, ce qui reste tracé à l'audit.)*
8. **[V3]** La scolarité peut **annuler une séance à une date précise** (« l'enseignant est absent mardi prochain ») sans supprimer le cours du reste du semestre.
9. **[V3.1]** La scolarité peut déclarer **combien d'étudiants compte un groupe**, en une saisie, et corriger ce nombre quand il évolue en cours d'année.
10. **[V3]** La scolarité peut **retrouver rapidement une salle, un cours, un groupe ou un programme** dans un référentiel volumineux, et **vérifier qu'une salle ou un cours existe déjà** au moment même où elle construit un créneau — sans quoi le volume de données de l'UJKZ rend la saisie plus coûteuse que le papier qu'elle remplace.
11. La scolarité peut consulter un historique de toutes les modifications apportées à l'emploi du temps (qui, quand, quoi, pourquoi), **[V3]** et le filtrer pour y retrouver un événement précis.

## 4. Hors périmètre

Explicitement exclu, pour éviter la dérive de périmètre :

- Gestion des notes, relevés, attestations, diplômes (déjà couvert par CampusFaso).
- Inscription administrative ou paiement des frais de scolarité.
- Planification des examens et surveillances (évolution V2 envisageable).
- Espace de cours en ligne (LMS/Moodle-like).
- Gestion de la vie étudiante hors enseignement (bourses, hébergement, restauration).
- Comptes DSI distincts (décision de cadrage 2026-08-11, toujours valable) — hors périmètre.
- ~~Extension multi-UFR~~ *(décision de cadrage 2026-08-11, **annulée le 2026-08-27**)* : c'est désormais le périmètre courant, pas une extension future — voir note de cadrage 2026-08-27 en §2. Reste hors périmètre pour cette itération : l'arbitrage automatique des conflits inter-UFR sur une salle commune/louée de la DEP (la salle est modélisée, mais le circuit de décision en cas de conflit entre deux UFR n'est pas encore spécifié — cf. `03_Contrat_Invariants_Campus_Manager.md` §4).
- **[V3, 2026-09-07]** **Comptes Étudiant et Enseignant** — retirés du périmètre (cf. §2). Aucune inscription en libre-service ne les remplace : le programme est public, il n'y a plus rien à protéger derrière un compte côté consultation.
- **[V3, 2026-09-07]** **Circuit de demandes enseignant** (absence, report, permutation) — retiré du périmètre. Le canal est le téléphone, la trace est la correction du programme elle-même (motif obligatoire + journal d'audit).
- **[V3.1, 2026-09-07]** **Référentiel nominatif des étudiants** — retiré du périmètre : import Excel/CSV d'étudiants, canevas de saisie, INE, affectation individuelle à un groupe, promotion de cohorte, et transfert d'un étudiant entre UFR. Seul subsiste l'**effectif** d'un groupe, saisi comme un nombre. Conséquence assumée et à connaître : le système ne peut plus vérifier cette valeur — elle vaut ce que le Gestionnaire a saisi, et un effectif oublié fait taire l'alerte de capacité correspondante.
- **[V3, 2026-09-07]** **Notification par SMS** — retirée. Elle supposait de détenir les coordonnées de chaque étudiant, ce qui n'a plus de sens sans comptes ; les canaux deviennent l'agenda personnel et une alerte navigateur optionnelle.
- Campus Manager n'est pas un concurrent de CampusFaso : aucune fonctionnalité d'orientation, d'inscription ou de résultats académiques n'y sera ajoutée.

## 5. Critères de succès

Comment on saura que le problème est réellement résolu (repris et rendus vérifiables à partir des critères de recette du cahier des charges, §10) :

| Critère | Mesure |
|---|---|
| Fin des doubles réservations non détectées | 0 conflit de salle non signalé constaté pendant le semestre pilote |
| Réduction du délai de communication d'un changement | Un changement de créneau est reçu par les utilisateurs concernés en moins d'une minute (réseau normal). **[V3]** Mesuré sur le canal le plus rapide dont dispose l'utilisateur : consultation du programme public et alerte navigateur sur un favori sont immédiates ; l'agenda personnel, lui, dépend du rythme de rafraîchissement du fournisseur d'agenda (plusieurs heures chez certains) et ne peut donc pas porter seul ce critère. |
| **[V3]** Adoption réelle par les étudiants | Le programme public est consulté sans qu'aucun compte n'ait eu à être créé, et une part mesurable des consultations passe par un favori ou un agenda abonné plutôt que par une recherche refaite à chaque fois |
| **[V3]** Vitesse de saisie côté scolarité | Retrouver une salle, un cours ou un groupe dans le référentiel ne demande plus de parcourir une liste complète — la recherche et les filtres couvrent les sections Programmes, Groupes, Salles, Cours et Journal d'audit |
| Continuité de service en cas de coupure | L'emploi du temps du dernier jour de synchronisation reste consultable sans connexion |
| Traçabilité des décisions | 100 % des modifications d'emploi du temps historisées avec auteur, date, motif |
| Adoption réelle par la scolarité pilote | La scolarité de l'UFR pilote cesse l'affichage papier pour l'emploi du temps courant d'ici la fin du semestre pilote |

## 6. Test de validité du PRD

Deux architectures différentes pourraient répondre à ce problème (ex. une PWA unique vs une app native + back-office séparé) sans changer une ligne de ce document — le choix technique (PWA, NestJS, PostgreSQL) appartient au cahier des charges et aux documents d'architecture, pas à ce PRD.

---

*Document d'ingénierie généré à partir du cahier des charges v2.1 et des décisions de cadrage des 2026-08-11, 2026-08-27 (V2 multi-UFR) et 2026-09-07 (V3 programme public). À faire évoluer si le cahier des charges change.*
