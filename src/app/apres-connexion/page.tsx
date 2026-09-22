import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CHEMIN_ESPACE_ADMIN } from "@/lib/espace-admin";

/**
 * [V8, 2026-09-21] Sas de redirection après connexion — page SERVEUR.
 *
 * Le formulaire de connexion décidait lui-même où envoyer l'utilisateur,
 * d'après le rôle que lui renvoyait l'API (`accueilPourRole`). C'est du
 * code client : la table des destinations partait donc dans le bundle
 * JavaScript, lisible par n'importe qui — y compris l'adresse de l'espace
 * Admin, qu'on vient précisément de rendre non annoncée. Les guides de test
 * d'intrusion (OWASP WSTG-CONF-05) citent les fichiers JavaScript comme le
 * premier endroit où chercher une interface d'administration « cachée ».
 *
 * La décision remonte donc ici, côté serveur, et le formulaire ne connaît
 * plus qu'une seule adresse : celle de cette page. Elle ne lit pas le rôle
 * transmis par le client mais le relit dans la session (GET /auth/me) :
 * pousser `?role=admin` dans l'URL ne mène donc nulle part.
 *
 * Aucun rendu : `redirect()` part avant.
 */
export default async function ApresConnexionPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  redirect(session.role === "admin" ? CHEMIN_ESPACE_ADMIN : "/scolarite");
}
