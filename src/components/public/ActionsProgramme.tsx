"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CalendarPlus, Check, Copy, Star } from "lucide-react";
import { apiFetch, apiUrl } from "@/lib/api";
import { ajouterFavori, retirerFavori, useEstFavori } from "@/lib/favoris";
import type { ProgrammePublic } from "@/lib/types";

// [V3] Les trois gestes que le visiteur peut poser sur un programme :
// le garder (FR-PUB-04), l'abonner à son agenda (FR-PUB-05), être alerté
// (FR-PUB-08). Aucun ne demande de compte.

// Une adresse locale (localhost, 127.x, 10.x, 172.16-31.x, 192.168.x) n'est
// joignable que depuis le réseau de développement. Or un agenda en ligne
// (Google, Outlook) va chercher le flux **depuis ses propres serveurs**, sur
// Internet : une URL privée ne lui répondra jamais. L'abonnement s'ajoute
// sans erreur, puis reste éternellement vide — un silence qu'on met des
// heures à diagnostiquer si rien ne l'annonce.
function estAdresseLocale(url: string): boolean {
  try {
    const hote = new URL(url).hostname;
    return (
      hote === "localhost" ||
      /^127\./.test(hote) ||
      /^10\./.test(hote) ||
      /^192\.168\./.test(hote) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hote)
    );
  } catch {
    return false;
  }
}

function urlCalendrier(groupeId: string): string {
  // URL absolue et non relative : elle est destinée à être collée dans une
  // application tierce (Google Agenda, Outlook), qui n'a aucune idée de
  // l'origine de notre site.
  const base = apiUrl(`/public/calendrier/${groupeId}.ics`);
  if (base.startsWith("http")) return base;
  return typeof window === "undefined" ? base : `${window.location.origin}${base}`;
}

export function ActionsProgramme({ programme }: { programme: ProgrammePublic }) {
  const groupe = programme.groupe;
  const favori = useEstFavori(groupe.id);
  const [agendaOuvert, setAgendaOuvert] = useState(false);
  const [copie, setCopie] = useState(false);
  const [alerte, setAlerte] = useState<"indisponible" | "inactive" | "active" | "en-cours">("indisponible");
  const [messageAlerte, setMessageAlerte] = useState<string | null>(null);

  // L'alerte n'est proposée que si TOUT est réuni : navigateur compatible,
  // Service Worker enregistré, et clé publique configurée côté serveur. À
  // défaut, le bouton n'apparaît pas — plutôt qu'un bouton qui échouerait au
  // clic sans que le visiteur puisse rien y faire.
  useEffect(() => {
    let annule = false;
    async function verifier() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reponse = await apiFetch("/public/alertes/cle").catch(() => null);
      if (!reponse?.ok) return;
      const { cle } = await reponse.json();
      if (!cle || annule) return;

      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const abonnement = await registration?.pushManager.getSubscription();
      if (annule) return;
      setAlerte(abonnement ? "active" : "inactive");
    }
    verifier();
    return () => {
      annule = true;
    };
  }, []);

  function basculerFavori() {
    if (favori) {
      retirerFavori(groupe.id);
      return;
    }
    ajouterFavori({
      groupeId: groupe.id,
      nom: groupe.nom,
      filiere: groupe.filiere,
      niveau: groupe.niveau,
      anneeAcademique: groupe.anneeAcademique,
      ufrSigle: groupe.ufr.sigleAffiche,
      ajouteLe: new Date().toISOString(),
    });
  }

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(urlCalendrier(groupe.id));
      setCopie(true);
      setTimeout(() => setCopie(false), 3000);
    } catch {
      setCopie(false);
    }
  }

  async function basculerAlerte() {
    setMessageAlerte(null);
    const registration = await navigator.serviceWorker.ready;

    if (alerte === "active") {
      const abonnement = await registration.pushManager.getSubscription();
      if (abonnement) {
        await apiFetch(
          `/public/alertes?groupeId=${encodeURIComponent(groupe.id)}&endpoint=${encodeURIComponent(abonnement.endpoint)}`,
          { method: "DELETE" }
        );
        await abonnement.unsubscribe();
      }
      setAlerte("inactive");
      return;
    }

    setAlerte("en-cours");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setAlerte("inactive");
      // ERR-03 : le refus ne dégrade rien d'autre — on le dit et on s'arrête.
      setMessageAlerte("Les notifications sont bloquées par votre navigateur. Votre agenda continue de fonctionner.");
      return;
    }

    const { cle } = await (await apiFetch("/public/alertes/cle")).json();
    const abonnement = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: cle,
    });

    const reponse = await apiFetch("/public/alertes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupeId: groupe.id, abonnement: abonnement.toJSON() }),
    });
    setAlerte(reponse.ok ? "active" : "inactive");
    if (!reponse.ok) setMessageAlerte("L'alerte n'a pas pu être activée. Réessayez plus tard.");
  }

  const url = urlCalendrier(groupe.id);
  const urlLocale = estAdresseLocale(url);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={basculerFavori}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            favori
              ? "border-status-warning bg-status-warning-bg text-text"
              : "border-border bg-surface text-text hover:bg-surface-muted"
          }`}
        >
          <Star className={`h-4 w-4 ${favori ? "fill-status-warning text-status-warning" : ""}`} aria-hidden="true" />
          {favori ? "Dans vos programmes" : "Garder ce programme"}
        </button>

        <button
          onClick={() => setAgendaOuvert((o) => !o)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Ajouter à mon agenda
        </button>

        {alerte !== "indisponible" ? (
          <button
            onClick={basculerAlerte}
            disabled={alerte === "en-cours"}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              alerte === "active"
                ? "border-status-success bg-status-success-bg text-text"
                : "border-border bg-surface text-text hover:bg-surface-muted"
            }`}
          >
            {alerte === "active" ? (
              <Bell className="h-4 w-4 text-status-success" aria-hidden="true" />
            ) : (
              <BellOff className="h-4 w-4" aria-hidden="true" />
            )}
            {alerte === "active" ? "Alertes activées" : "M'alerter"}
          </button>
        ) : null}
      </div>

      {messageAlerte ? <p className="text-sm text-text-muted">{messageAlerte}</p> : null}

      {agendaOuvert ? (
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-text">Copiez cette adresse dans votre agenda</p>
          <p className="mt-1 text-xs text-text-muted">
            Une seule fois : votre agenda se mettra ensuite à jour tout seul à chaque changement de programme.
          </p>

          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-muted"
            />
            <button
              onClick={copierLien}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              {copie ? <Check className="h-4 w-4 text-status-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copie ? "Copié" : "Copier"}
            </button>
          </div>

          {urlLocale ? (
            <p className="mt-3 rounded-lg bg-status-warning-bg px-3 py-2 text-xs text-text">
              <strong className="font-semibold">Adresse locale.</strong> Google Agenda et Outlook vont chercher le
              programme depuis leurs propres serveurs, sur Internet : cette adresse ne leur répondra pas et
              l&apos;agenda restera vide. Utilisable uniquement pour un essai depuis cet appareil, en attendant la
              mise en ligne.
            </p>
          ) : null}

          <ul className="mt-3 space-y-1 text-xs text-text-muted">
            <li>
              <strong className="font-medium text-text">Google Agenda</strong> : Autres agendas → + → À partir de
              l&apos;URL
            </li>
            <li className="pt-1 text-text-subtle">
              {/* Distinction décisive et jamais évidente : un fichier .ics
                  importé est une COPIE figée, qui ne se mettra jamais à jour.
                  Seul l'abonnement par URL suit les changements. */}
              Choisissez bien <strong className="font-medium text-text">« à partir de l&apos;URL »</strong> et non
              « importer un fichier » : un fichier importé est une copie figée, il ne suivra aucune modification.
            </li>
            <li>
              <strong className="font-medium text-text">iPhone</strong> : Réglages → Calendrier → Comptes → Ajouter un
              abonnement
            </li>
            <li>
              <strong className="font-medium text-text">Outlook</strong> : Ajouter un calendrier → S&apos;abonner à
              partir du Web
            </li>
          </ul>

          {/* Dit une fois, franchement, plutôt que découvert par l'usager le
              jour où une annulation arrive trop tard (FR-NOTIF-05). */}
          <p className="mt-3 border-t border-border pt-3 text-xs text-text-subtle">
            Google Agenda ne relit un agenda extérieur que toutes les quelques heures. Pour être prévenu
            immédiatement d&apos;une annulation, activez aussi « M&apos;alerter ».
          </p>
        </div>
      ) : null}
    </div>
  );
}
