"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";
import { accueilPourRole } from "@/lib/roles";
import type { Role } from "@/lib/types";
import { apiFetch } from "@/lib/api";

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

    const reponse = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, motDePasse }),
    });

    setEnCours(false);

    if (!reponse.ok) {
      const data = await reponse.json();
      setErreur(data.erreur ?? "Une erreur est survenue.");
      // FR-AUTH-03 : ce compte existe mais n'a jamais été activé — le
      // signaler explicitement plutôt que de laisser l'utilisateur deviner
      // pourquoi "Se connecter" échoue (retour utilisateur : import d'un
      // étudiant, tentative de connexion directe, aucune indication).
      setCompteNonActive(data.codeErreur === "compte_non_active");
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
          <Image
            src="/logo-universite.png"
            alt="Université Joseph Ki-Zerbo"
            width={56}
            height={56}
            priority
            className="h-14 w-14 object-contain"
          />
          <h1 className="mt-4 text-xl font-bold text-text">Campus Manager</h1>
          <p className="text-sm text-text-muted">Portail d&apos;authentification</p>
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

        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-text-subtle">
          Besoin d&apos;assistance ?
          <br />
          Contactez le support technique de l&apos;université.
        </div>
      </div>
    </div>
  );
}
