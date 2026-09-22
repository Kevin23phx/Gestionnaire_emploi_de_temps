/**
 * [V8, 2026-09-21] Emplacement de l'espace Admin — SERVEUR UNIQUEMENT.
 *
 * ## Le problème
 *
 * L'espace Admin vivait à `/admin` : l'adresse la plus devinée du web, et
 * la première que balaient les robots qui ratissent les sites à la
 * recherche d'un formulaire de connexion. Pire, un visiteur non connecté
 * qui l'ouvrait était **redirigé vers /connexion** — c'est-à-dire que le
 * système lui confirmait que la section existait, information qu'il
 * n'avait pas avant de frapper à la porte.
 *
 * ## Ce qui est fait, et ce que ça vaut
 *
 * Trois couches, empruntées au patron `ADMIN_URL` de l'écosystème Django
 * (recherche du 2026-09-21) :
 *
 * 1. **L'adresse est déplacée** sur un chemin non annoncé, réglable par
 *    variable d'environnement — jamais écrit en dur, pour qu'il puisse
 *    changer sans toucher au code.
 * 2. **`/admin` répond 404**, exactement comme n'importe quelle adresse
 *    inexistante. Plus de redirection : rien ne distingue « cette section
 *    n'existe pas » de « cette section existe mais pas pour vous ».
 * 3. **Le chemin ne part jamais au navigateur** d'un visiteur ordinaire :
 *    ce fichier est importé uniquement depuis du code serveur, et la
 *    redirection après connexion passe par `/apres-connexion`, qui décide
 *    côté serveur. Un chemin exposé via `NEXT_PUBLIC_*` se serait retrouvé
 *    dans le bundle JavaScript public — c'est précisément là que les
 *    guides de test d'intrusion (OWASP WSTG-CONF-05) conseillent d'aller
 *    chercher les interfaces d'administration « cachées ».
 *
 * ## Ce que ça ne vaut PAS
 *
 * Aucune de ces trois couches n'est un contrôle d'accès, et l'OWASP est
 * explicite là-dessus : l'obscurité n'est pas de la sécurité. Le vrai
 * verrou reste le RBAC du backend (`require_roles("admin")`, Django), qui
 * refuse la donnée même à qui connaît le chemin. Ce fichier ne fait que
 * réduire la surface exposée aux balayages automatisés — la couche la
 * moins chère, pas la plus importante.
 */

/**
 * Valeur par défaut délibérément quelconque : ni « admin », ni « backoffice »,
 * ni rien qui figure dans les listes de chemins que testent les scanners.
 * À REMPLACER en production via la variable d'environnement
 * `CHEMIN_ESPACE_ADMIN` — un défaut publié dans un dépôt n'est plus un
 * secret.
 *
 * L'Admin n'a de toute façon pas à connaître ni à saisir cette adresse : il
 * se connecte sur `/connexion` comme tout le monde et `/apres-connexion`
 * l'y dépose.
 */
export const CHEMIN_ESPACE_ADMIN = normaliser(process.env.CHEMIN_ESPACE_ADMIN ?? "/direction-ujkz");

/** Chemin interne réel des pages, inchangé : seule l'URL publique bouge. */
export const CHEMIN_INTERNE_ADMIN = "/admin";

/**
 * En-tête posé par `proxy.ts` sur la réécriture, et lu par le layout de
 * l'espace Admin. C'est lui qui permet de distinguer les deux chemins une
 * fois la réécriture faite : côté application, `/direction-ujkz/audit` et
 * `/admin/audit` sont devenus la même route, et sans ce marqueur le layout
 * n'aurait aucun moyen de refuser le second.
 *
 * Un en-tête entrant du même nom, envoyé par un client malin, ne donne
 * rien : `proxy.ts` s'exécute sur chaque requête concernée et réécrit
 * l'en-tête à partir de zéro (cf. proxy.ts).
 */
export const EN_TETE_ESPACE_ADMIN = "x-cm-espace-admin";

function normaliser(chemin: string): string {
  const nettoye = chemin.trim().replace(/\/+$/, "");
  if (!nettoye) return "/direction-ujkz";
  return nettoye.startsWith("/") ? nettoye : `/${nettoye}`;
}
