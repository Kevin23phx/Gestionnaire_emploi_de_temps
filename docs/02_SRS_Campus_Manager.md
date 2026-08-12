# SRS — Campus Manager (MVP, UFR pilote)

**Étape 2 de la chaîne méthodologique** — répond à : *que doit garantir le système, exactement, sans dire comment ?*
Vocabulaire normatif RFC 2119 : **DOIT** (obligation absolue) · **NE DOIT PAS** (interdiction absolue) · **DEVRAIT** (forte recommandation) · **PEUT** (optionnel).

Périmètre : MVP à 3 acteurs (Étudiant, Enseignant, Scolarité d'UFR), une seule UFR pilote, aucune salle commune/louée, aucun acteur DEP/DSI (décision de cadrage du 2026-08-11 — cf. `01_PRD_Campus_Manager.md`, note §2).

---

## 1. Acteurs

| Acteur | Type | Rôle |
|---|---|---|
| Étudiant | Humain | Lecture seule sur l'emploi du temps de son propre groupe |
| Enseignant | Humain | Lecture sur son propre planning, écriture limitée (signalements soumis à validation) |
| Scolarité d'UFR | Humain | Contrôle total sur le référentiel et l'emploi du temps de l'UFR pilote |
| Système (moteur de conflits, notification, synchronisation) | Non-humain | Applique automatiquement les règles ci-dessous, sans intervention humaine |

## 2. Exigences fonctionnelles

### 2.1 Authentification et comptes

| ID | Exigence |
|---|---|
| FR-AUTH-01 | Le Système DOIT permettre à un Étudiant, un Enseignant ou une Scolarité d'UFR de s'authentifier par identifiant et mot de passe. |
| FR-AUTH-02 | Le Système DOIT déterminer automatiquement le rôle de l'utilisateur authentifié à partir de son compte, sans que l'utilisateur ait à le sélectionner. |
| FR-AUTH-03 | Le Système DOIT permettre à un utilisateur disposant d'un compte pré-provisionné (matricule fourni par la scolarité) d'activer ce compte en définissant un mot de passe lors de sa première connexion. |
| FR-AUTH-04 | Le Système NE DOIT PAS permettre la création d'un compte en libre-service. Les comptes sont provisionnés exclusivement par la Scolarité d'UFR (import de référentiel, cf. FR-REF-01). |

### 2.2 Référentiel académique

| ID | Exigence |
|---|---|
| FR-REF-01 | Le Système DOIT permettre à la Scolarité d'UFR d'importer les référentiels (filières, niveaux, groupes, UE, salles, enseignants) via un fichier structuré (Excel/CSV). |
| FR-REF-02 | Le Système DOIT permettre à la Scolarité d'UFR de créer/modifier une salle avec au minimum : nom, capacité d'accueil, structure gestionnaire, type d'usage. |
| FR-REF-03 | Chaque salle DOIT être rattachée à exactement une structure gestionnaire (pour le MVP : toujours l'UFR pilote — champ conservé pour compatibilité V2). |

### 2.3 Construction de l'emploi du temps

| ID | Exigence |
|---|---|
| FR-EDT-01 | Le Système DOIT permettre à la Scolarité d'UFR de créer un créneau (récurrent hebdomadaire ou ponctuel) avec au minimum : UE, enseignant, groupe, salle, jour, heure de début, heure de fin. |
| FR-EDT-02 | Le Système DOIT permettre à la Scolarité d'UFR de modifier un créneau existant, à condition de saisir un motif. |
| FR-EDT-03 | Le Système DOIT permettre à la Scolarité d'UFR d'annuler un créneau, à condition de saisir un motif. |
| FR-EDT-04 | Le Système DOIT permettre à un Étudiant de consulter l'emploi du temps de son propre groupe. |
| FR-EDT-05 | Le Système DOIT permettre à un Enseignant de consulter son propre planning. |
| FR-EDT-06 | Un Étudiant NE DOIT PAS pouvoir consulter ou modifier l'emploi du temps d'un groupe autre que le sien. |

### 2.4 Moteur de détection de conflits

| ID | Exigence |
|---|---|
| FR-CONF-01 | Le Système DOIT détecter, à la création ou modification d'un créneau, tout conflit de salle (même salle, plages horaires chevauchantes, y compris partiellement). |
| FR-CONF-02 | Le Système DOIT détecter tout conflit d'enseignant (même enseignant sur deux créneaux chevauchants). |
| FR-CONF-03 | Le Système DOIT détecter tout conflit de groupe (même groupe sur deux créneaux chevauchants). |
| FR-CONF-04 | Le Système DOIT détecter tout conflit de capacité (effectif du groupe > capacité de la salle). |
| FR-CONF-05 | Le Système DOIT catégoriser chaque conflit détecté par gravité : **bloquant** ou **avertissement**. |
| FR-CONF-06 | Le Système DOIT afficher le(s) conflit(s) détecté(s) à la Scolarité d'UFR avant l'enregistrement définitif du créneau. |
| FR-CONF-07 | Le Système DOIT permettre à la Scolarité d'UFR d'enregistrer un créneau malgré un conflit détecté (bloquant ou avertissement), à condition de saisir un motif de dérogation. |
| FR-CONF-08 | Le Système DOIT tracer dans le journal d'audit toute dérogation à un conflit, avec auteur, date et motif. |

### 2.5 Notifications

| ID | Exigence |
|---|---|
| FR-NOTIF-01 | Le Système DOIT notifier, en moins d'une minute en conditions de réseau normal, tout Étudiant et Enseignant concerné par la création, la modification ou l'annulation d'un créneau qui les affecte. |
| FR-NOTIF-02 | Le Système DOIT permettre à l'utilisateur de consulter l'historique de ses notifications reçues. |
| FR-NOTIF-03 | Le Système DOIT envoyer une notification par canal de secours (SMS et/ou e-mail) pour les changements critiques (annulation, changement de salle le jour même). |
| FR-NOTIF-04 | Le Système NE DOIT PAS envoyer de SMS pour une notification non critique. |

### 2.6 Mode hors-ligne et synchronisation

| ID | Exigence |
|---|---|
| FR-OFF-01 | Le Système DOIT mettre en cache localement le dernier emploi du temps connu de l'utilisateur. |
| FR-OFF-02 | Le Système DOIT afficher explicitement la date et l'heure de la dernière synchronisation réussie lorsqu'il fonctionne hors-ligne. |
| FR-OFF-03 | Le Système DOIT mettre en file d'attente toute action effectuée hors-ligne et l'appliquer automatiquement au retour de connexion. |

### 2.7 Signalement enseignant

| ID | Exigence |
|---|---|
| FR-SIG-01 | Le Système DOIT permettre à un Enseignant de signaler une absence ou de demander un report/permutation de créneau. |
| FR-SIG-02 | Toute demande enseignant DOIT être validée par la Scolarité d'UFR avant application effective à l'emploi du temps publié. |
| FR-SIG-03 | Le Système DOIT permettre à l'Enseignant de consulter le statut de sa demande (en attente / validée / refusée). |

### 2.8 Audit et tableau de bord

| ID | Exigence |
|---|---|
| FR-AUD-01 | Le Système DOIT historiser chaque création, modification et annulation de créneau avec : auteur, date/heure, action, motif. |
| FR-AUD-02 | Le Système DOIT permettre à la Scolarité d'UFR de consulter et d'exporter le journal d'audit. |
| FR-AUD-03 | Une entrée du journal d'audit NE DOIT PAS pouvoir être modifiée ou supprimée après sa création. |
| FR-DASH-01 | Le Système DOIT afficher à la Scolarité d'UFR : le taux d'occupation des salles, le nombre de conflits détectés/résolus, le nombre de cours annulés sur une période donnée. |

## 3. Règles métier

| ID | Règle |
|---|---|
| RM-01 | Un créneau est défini par (salle, jour, heure de début, heure de fin). Deux créneaux dans la même salle sont en conflit si leurs plages horaires se chevauchent, même partiellement. |
| RM-02 | Un conflit de capacité est déclaré si effectif(groupe) > capacité(salle). |
| RM-03 | Un compte utilisateur a exactement un rôle parmi {Étudiant, Enseignant, Scolarité d'UFR} pour le MVP. |
| RM-04 | Une demande enseignant a exactement 3 états possibles : en attente, validée, refusée. |
| RM-05 | Pour le MVP (une seule UFR pilote), seule la Scolarité d'UFR peut créer/modifier un créneau ou une salle. |

## 4. Contraintes non-fonctionnelles

| ID | Exigence | Justification |
|---|---|---|
| NFR-PERF-01 | Le Système DOIT supporter au moins 5 000 utilisateurs simultanés avec un temps de réponse p95 < 2 s sur les opérations de lecture. | Décision de cadrage 2026-08-11, à réviser après le pilote avec des données réelles d'usage. |
| NFR-DISPO-01 | Le Système DOIT rester consultable en lecture seule sans connexion réseau, à partir des données de la dernière synchronisation réussie. | Coupures réseau/électriques résiduelles documentées (cahier des charges §1.4). |
| NFR-DATA-01 | Le Système DOIT charger l'emploi du temps en moins de 3 secondes sur un réseau 3G, sur un navigateur Android d'entrée de gamme. | Coût réel de la donnée pour l'étudiant moyen, parc de terminaux dominé par l'Android économique. |
| NFR-SEC-01 | Le Système DOIT chiffrer toutes les communications en transit (HTTPS). | Standard attendu pour un système académique institutionnel. |
| NFR-SEC-02 | Un Étudiant NE DOIT PAS avoir de droit d'écriture sur une quelconque donnée d'emploi du temps. | RBAC, cahier des charges §4.6. |
| NFR-LEGAL-01 | Le Système DOIT informer les personnes concernées de la finalité du traitement de leurs données personnelles. | Loi n°001-2021/AN portant protection des données personnelles. |

## 5. Cas d'erreur

| ID | Scénario | Comportement attendu |
|---|---|---|
| ERR-01 | La base de données est inaccessible au moment d'une lecture. | Le Système DOIT servir la dernière version en cache avec l'indicateur de fraîcheur visible (FR-OFF-02), plutôt qu'une erreur bloquante. |
| ERR-02 | Un import de référentiel contient une ligne invalide (champ obligatoire manquant, doublon). | Le Système DOIT rejeter uniquement cette ligne et produire un rapport d'anomalies, sans bloquer l'import des lignes valides. |
| ERR-03 | Une notification push échoue (terminal incompatible, PWA non installée). | Le Système DOIT basculer sur le canal de secours (SMS/e-mail) uniquement pour les changements critiques (FR-NOTIF-03). |
| ERR-04 | Deux modifications concurrentes sont soumises sur le même créneau au même instant. | Le Système DOIT appliquer la première validée et signaler un conflit à la seconde, sans écraser silencieusement les données. |

## 6. Test de validité (auto-vérification)

Chaque exigence ci-dessus est : **validable** (rattachée à un problème du PRD), **testable** (peut devenir un test unitaire/intégration), **contestable** (un chiffre ou un DOIT/NE DOIT PAS précis, pas un adjectif vague). Aucune exigence ne mentionne de technologie (SQL, NestJS, React) — ce choix appartient au document d'architecture.

---

*Document d'ingénierie — Étape 2/5. Prochaine étape : Contrat Système & Invariants (`03_Contrat_Invariants_Campus_Manager.md`).*
