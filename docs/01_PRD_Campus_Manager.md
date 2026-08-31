# PRD — Campus Manager

**Étape 1 de la chaîne méthodologique** — répond à : *pourquoi ce système doit-il exister ?*
Ce document fige le **problème**. Il ne mentionne aucune solution technique — c'est le rôle du SRS et de l'architecture (documents suivants).

Sources : `Cahier_des_charges_Campus_Manager.md` (v2.1), décisions de cadrage prises le 2026-08-11 et le 2026-08-27 (voir notes de cadrage en fin de document).

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

- **L'étudiant** d'un groupe/filière d'une UFR de l'UJKZ, qui se déplace parfois pour un cours annulé ou déplacé faute d'avoir été informé à temps.
- **L'enseignant**, rattaché à une ou plusieurs UE, qui doit signaler une absence ou un report et n'a aujourd'hui aucun canal structuré pour le faire ni pour savoir si sa demande a été prise en compte.
- **La scolarité de l'UFR** (désormais **Gestionnaire de scolarité d'UFR**), qui construit et corrige l'emploi du temps de sa propre UFR à la main, sans outil pour détecter automatiquement un conflit de salle, d'enseignant ou de capacité avant qu'il ne se produise sur le terrain.
- **L'Admin** *(nouveau, 2026-08-27)* : le porteur de projet côté UJKZ a remonté qu'un seul compte scolarité ne peut plus, à l'échelle de l'établissement (5 UFR, ~48 000 étudiants), gérer à la fois le référentiel/planning de chaque UFR et la supervision d'ensemble. L'Admin ne gère plus lui-même le référentiel ou le planning d'une UFR — il crée les UFR, y affecte un compte Gestionnaire, et supervise (lecture) l'activité de toutes les UFR.

> **Note de cadrage (2026-08-11, révisée 2026-08-27)** : le cahier des charges (§3) identifie deux acteurs supplémentaires — la DEP (structure intervenant sur les salles communes/louées) et le DSI (administration système). Le DSI reste **hors périmètre**. La **DEP entre dans le périmètre dès le 2026-08-27** : elle est modélisée comme une structure gestionnaire transversale de salles communes/louées (au même titre qu'une UFR pour le champ "structure gestionnaire" d'une salle), mais sans compte dédié pour l'instant — ses salles sont administrées par l'Admin en attendant qu'un référent DEP soit désigné côté UJKZ.

## 3. Cas d'usage principaux

Ce que l'utilisateur doit pouvoir faire (sans dire comment) :

1. Un étudiant peut consulter l'emploi du temps de son groupe à tout moment, y compris sans connexion internet active.
2. Un étudiant est informé, sans avoir à vérifier activement, dès qu'un cours de son groupe est annulé, déplacé ou changé de salle.
3. Un enseignant peut consulter son propre planning et signaler une indisponibilité ou demander un changement de créneau.
4. La scolarité d'une UFR peut construire l'emploi du temps de son UFR et être alertée, au moment de la saisie, si elle crée un conflit (salle, enseignant, groupe, capacité).
5. La scolarité peut valider ou refuser une demande d'un enseignant, et voir son planning se mettre à jour en conséquence.
6. La scolarité peut consulter un historique de toutes les modifications apportées à l'emploi du temps (qui, quand, quoi, pourquoi).

## 4. Hors périmètre

Explicitement exclu, pour éviter la dérive de périmètre :

- Gestion des notes, relevés, attestations, diplômes (déjà couvert par CampusFaso).
- Inscription administrative ou paiement des frais de scolarité.
- Planification des examens et surveillances (évolution V2 envisageable).
- Espace de cours en ligne (LMS/Moodle-like).
- Gestion de la vie étudiante hors enseignement (bourses, hébergement, restauration).
- Comptes DSI distincts (décision de cadrage 2026-08-11, toujours valable) — hors périmètre.
- ~~Extension multi-UFR~~ *(décision de cadrage 2026-08-11, **annulée le 2026-08-27**)* : c'est désormais le périmètre courant, pas une extension future — voir note de cadrage 2026-08-27 en §2. Reste hors périmètre pour cette itération : l'arbitrage automatique des conflits inter-UFR sur une salle commune/louée de la DEP (la salle est modélisée, mais le circuit de décision en cas de conflit entre deux UFR n'est pas encore spécifié — cf. `03_Contrat_Invariants_Campus_Manager.md` §4).
- Campus Manager n'est pas un concurrent de CampusFaso : aucune fonctionnalité d'orientation, d'inscription ou de résultats académiques n'y sera ajoutée.

## 5. Critères de succès

Comment on saura que le problème est réellement résolu (repris et rendus vérifiables à partir des critères de recette du cahier des charges, §10) :

| Critère | Mesure |
|---|---|
| Fin des doubles réservations non détectées | 0 conflit de salle non signalé constaté pendant le semestre pilote |
| Réduction du délai de communication d'un changement | Un changement de créneau est reçu par les utilisateurs concernés en moins d'une minute (réseau normal) |
| Continuité de service en cas de coupure | L'emploi du temps du dernier jour de synchronisation reste consultable sans connexion |
| Traçabilité des décisions | 100 % des modifications d'emploi du temps historisées avec auteur, date, motif |
| Adoption réelle par la scolarité pilote | La scolarité de l'UFR pilote cesse l'affichage papier pour l'emploi du temps courant d'ici la fin du semestre pilote |

## 6. Test de validité du PRD

Deux architectures différentes pourraient répondre à ce problème (ex. une PWA unique vs une app native + back-office séparé) sans changer une ligne de ce document — le choix technique (PWA, NestJS, PostgreSQL) appartient au cahier des charges et aux documents d'architecture, pas à ce PRD.

---

*Document d'ingénierie généré à partir du cahier des charges v2.1 et des décisions de cadrage du 2026-08-11. À faire évoluer si le cahier des charges change.*
