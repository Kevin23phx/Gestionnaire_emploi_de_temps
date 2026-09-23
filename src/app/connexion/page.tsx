"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";
import { CHEMIN_APRES_CONNEXION } from "@/lib/roles";
import { apiFetch, lireReponse, messageErreur } from "@/lib/api";

export default function ConnexionPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [compteNonActive, setCompteNonActive] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErreur(null);
    setCompteNonActive(false);
    setEnCours(true);

    // [V8.6] Enveloppé : `await apiFetch(...)` lève quand le serveur est
    // injoignable, et le bouton restait alors bloqué sur « Connexion... »
    // sans message. C'est le pire endroit où laisser ce défaut — un backend
    // à l'arrêt est exactement le moment où quelqu'un essaie de se
    // connecter et ne comprend pas pourquoi rien ne se passe.
    try {
      const reponse = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, motDePasse }),
      });

      if (!reponse.ok) {
        const data = await lireReponse<{ erreur?: string; codeErreur?: string }>(reponse);
        setErreur(messageErreur(reponse, data, "Une erreur est survenue."));
        // FR-AUTH-03 : ce compte existe mais n'a jamais été activé — le
        // signaler explicitement plutôt que de laisser l'utilisateur deviner
        // pourquoi "Se connecter" échoue. [V3] Ne concerne plus que les
        // comptes Gestionnaire créés par l'Admin.
        setCompteNonActive(data.codeErreur === "compte_non_active");
        return;
      }

      // [V8] Le rôle renvoyé par l'API n'est plus lu ici : c'est
      // /apres-connexion qui aiguille, côté serveur, à partir de la session.
      // Voir src/lib/roles.ts.
      router.push(CHEMIN_APRES_CONNEXION);
      router.refresh();
    } catch {
      setErreur("Le serveur est injoignable. Vérifiez votre connexion, puis réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-universite.png"
            alt="Université Joseph Ki-Zerbo"
            width={56}
            height={56}
            priority
            className="h-14 w-14 object-contain"
          />
          <h1 className="mt-4 text-xl font-bold text-text">Campus Manager</h1>
          <p className="text-sm text-text-muted">Espace gestionnaire</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="identifiant" className="text-sm font-medium text-text">
              Identifiant
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <User className="h-4 w-4 text-text-subtle" aria-hidden="true" />
              <input
                id="identifiant"
                name="identifiant"
                type="text"
                required
                autoComplete="username"
                placeholder="Numéro matricule ou email"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                className="w-full text-sm outline-none placeholder:text-text-subtle"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="mot-de-passe" className="text-sm font-medium text-text">
                Mot de passe
              </label>
              <Link href="/aide" className="text-xs font-medium text-brand hover:underline">
                Oublié ?
              </Link>
            </div>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Lock className="h-4 w-4 text-text-subtle" aria-hidden="true" />
              <input
                id="mot-de-passe"
                name="mot-de-passe"
                type="password"
                required
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full text-sm outline-none"
              />
            </div>
          </div>

          {erreur ? (
            <div className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
              <p>{erreur}</p>
              {compteNonActive ? (
                <Link
                  href={`/activation?identifiant=${encodeURIComponent(identifiant)}`}
                  className="mt-1 inline-block font-medium underline"
                >
                  Activer mon compte maintenant →
                </Link>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={enCours}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {enCours ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Première connexion ?{" "}
          <Link href="/activation" className="font-medium text-brand hover:underline">
            Activez votre compte
          </Link>
        </p>

        {/* [V3] Cet écran ne concerne plus que les gestionnaires de
            scolarité et l'administrateur : un étudiant ou un enseignant qui
            y arriverait par habitude doit être renvoyé vers la consultation
            publique plutôt que de chercher un compte qui n'existe pas. */}
        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-text-subtle">
          Vous cherchez votre emploi du temps ?{" "}
          <Link href="/" className="font-medium text-brand hover:underline">
            Il est consultable sans compte
          </Link>
          .
          <br />
          <span className="mt-2 block">Besoin d&apos;assistance ? Contactez le support technique de l&apos;université.</span>
        </div>
      </div>
    </div>
  );
}
