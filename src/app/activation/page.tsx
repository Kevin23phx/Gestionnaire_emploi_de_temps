"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, User } from "lucide-react";
import { accueilPourRole } from "@/lib/roles";
import type { Role } from "@/lib/types";

export default function ActivationPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    const reponse = await fetch("/api/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, nouveauMotDePasse, confirmationMotDePasse }),
    });

    setEnCours(false);

    if (!reponse.ok) {
      const data = await reponse.json();
      setErreur(data.erreur ?? "Une erreur est survenue.");
      return;
    }

    const { role }: { role: Role } = await reponse.json();
    router.push(accueilPourRole(role));
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-white">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-text">Activation de votre compte</h1>
          <p className="mt-1 text-sm text-text-muted">
            Votre compte a été créé par la scolarité de votre UFR. Définissez
            votre mot de passe pour y accéder.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="identifiant" className="text-sm font-medium text-text">
              Identifiant / matricule
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <User className="h-4 w-4 text-text-subtle" aria-hidden="true" />
              <input
                id="identifiant"
                name="identifiant"
                type="text"
                required
                placeholder="Fourni par la scolarité"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                className="w-full text-sm outline-none placeholder:text-text-subtle"
              />
            </div>
          </div>

          <div>
            <label htmlFor="nouveau-mdp" className="text-sm font-medium text-text">
              Nouveau mot de passe
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Lock className="h-4 w-4 text-text-subtle" aria-hidden="true" />
              <input
                id="nouveau-mdp"
                name="nouveau-mdp"
                type="password"
                required
                autoComplete="new-password"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                className="w-full text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmation-mdp" className="text-sm font-medium text-text">
              Confirmer le mot de passe
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Lock className="h-4 w-4 text-text-subtle" aria-hidden="true" />
              <input
                id="confirmation-mdp"
                name="confirmation-mdp"
                type="password"
                required
                autoComplete="new-password"
                value={confirmationMotDePasse}
                onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                className="w-full text-sm outline-none"
              />
            </div>
          </div>

          {erreur ? (
            <p className="rounded-lg bg-status-danger-bg px-3 py-2 text-sm text-status-danger">
              {erreur}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enCours}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {enCours ? "Activation..." : "Activer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Déjà activé ?{" "}
          <Link href="/connexion" className="font-medium text-brand hover:underline">
            Se connecter
          </Link>
        </p>

        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-text-subtle">
          Besoin d&apos;assistance ?
          <br />
          Contactez le support technique de l&apos;université.
        </div>
      </div>
    </div>
  );
}
