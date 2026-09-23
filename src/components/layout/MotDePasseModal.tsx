"use client";

import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";

/**
 * [V8.3, 2026-09-23] FR-AUTH-07 — le titulaire change son mot de passe.
 *
 * Retour du porteur de projet : le mot de passe posé au provisionnement
 * restait en place indéfiniment. Il était connu de quiconque avait vu le
 * script d'amorçage, et aucun écran ne permettait d'en changer — la page
 * d'activation (FR-AUTH-03) ne fonctionne qu'une fois, sur un compte
 * jamais activé. Un compte dont on ne peut pas changer le secret n'est pas
 * un compte personnel.
 *
 * ## Pourquoi le mot de passe actuel est demandé
 *
 * On est déjà connecté : le serveur sait qui écrit. L'exiger quand même
 * n'est donc pas une formalité, c'est ce qui empêche qu'un poste laissé
 * ouvert dans un couloir suffise à s'emparer du compte pour de bon. Le
 * contrôle est fait côté serveur (accounts/auth_service.py) ; ce
 * formulaire ne fait que le demander.
 *
 * ## Ce qui se passe après
 *
 * Toutes les sessions du compte sont fermées, y compris sur d'autres
 * appareils, et une seule est réémise pour ce navigateur. L'utilisateur
 * reste donc connecté ICI — le déconnecter de l'écran où il vient de
 * réussir son changement lui ferait croire à un échec — mais une session
 * oubliée ailleurs tombe, ce qui est tout l'intérêt du geste. Le message
 * de succès le dit, sinon personne ne le saurait.
 */
export function MotDePasseModal({ onClose }: { onClose: () => void }) {
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Vérifiée ici ET côté serveur : ici pour ne pas faire un aller-retour
  // réseau qui se soldera par un refus, là-bas parce que c'est le seul
  // endroit où la règle est réellement appliquée (un formulaire se
  // contourne). La valeur vient de LONGUEUR_MIN_MOT_DE_PASSE dans
  // accounts/auth_service.py, qui reste la source de vérité.
  const LONGUEUR_MIN = 8;
  const tropCourt = nouveau.length > 0 && nouveau.length < LONGUEUR_MIN;
  const discordant = confirmation.length > 0 && nouveau !== confirmation;
  const peutEnvoyer =
    !enCours && actuel.length > 0 && nouveau.length >= LONGUEUR_MIN && nouveau === confirmation;

  async function envoyer() {
    if (!peutEnvoyer) return;
    setErreur(null);
    setEnCours(true);
    try {
      const reponse = await apiFetch("/auth/mot-de-passe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motDePasseActuel: actuel,
          nouveauMotDePasse: nouveau,
          confirmationMotDePasse: confirmation,
        }),
      });
      const data = await lireReponse<{ erreur?: string }>(reponse);
      if (!reponse.ok) {
        setErreur(messageErreur(reponse, data, "Impossible de changer le mot de passe."));
        return;
      }
      setSucces(true);
      // Les champs sont vidés dès le succès : laisser le nouveau mot de
      // passe en clair à l'écran après coup, sur un poste partagé, annule
      // une partie du bénéfice de l'avoir changé.
      setActuel("");
      setNouveau("");
      setConfirmation("");
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text">
            <KeyRound className="h-5 w-5 text-brand" aria-hidden="true" />
            Changer mon mot de passe
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted" aria-label="Fermer">
            <X className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {succes ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-status-success-bg px-3 py-2 text-sm text-status-success">
              Mot de passe changé. Vous restez connecté ici, mais toute session ouverte sur un autre
              appareil a été fermée — il faudra s&apos;y reconnecter avec le nouveau mot de passe.
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="mdp-actuel" className="text-sm font-medium text-text">
                Mot de passe actuel
              </label>
              <input
                id="mdp-actuel"
                type="password"
                autoComplete="current-password"
                value={actuel}
                onChange={(e) => setActuel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
              <p className="mt-1 text-xs text-text-subtle">
                Demandé même si vous êtes connecté : c&apos;est ce qui empêche qu&apos;un poste laissé ouvert
                suffise à prendre le contrôle de votre compte.
              </p>
            </div>

            <div>
              <label htmlFor="mdp-nouveau" className="text-sm font-medium text-text">
                Nouveau mot de passe
              </label>
              <input
                id="mdp-nouveau"
                type="password"
                autoComplete="new-password"
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
              <p className={`mt-1 text-xs ${tropCourt ? "text-status-danger" : "text-text-subtle"}`}>
                {LONGUEUR_MIN} caractères minimum. Une phrase dont vous vous souvenez vaut mieux
                qu&apos;un mot court compliqué.
              </p>
            </div>

            <div>
              <label htmlFor="mdp-confirmation" className="text-sm font-medium text-text">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="mdp-confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") envoyer();
                }}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              />
              {discordant ? (
                <p className="mt-1 text-xs text-status-danger">Les deux saisies ne correspondent pas.</p>
              ) : null}
            </div>

            {erreur ? (
              <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{erreur}</p>
            ) : null}

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
              >
                Annuler
              </button>
              <button
                onClick={envoyer}
                disabled={!peutEnvoyer}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {enCours ? "Enregistrement..." : "Changer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
