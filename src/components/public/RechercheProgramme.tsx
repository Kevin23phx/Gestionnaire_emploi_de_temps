"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { GroupePublic, Ufr } from "@/lib/types";

// [V3] FR-PUB-02 — cascade UFR → filière → niveau → groupe.
//
// Quatre étages et non deux : « UFR + niveau », proposé au départ, ne
// désigne pas un programme. À l'échelle d'une UFR de l'UJKZ, « UFR/SEA, L1 »
// recouvre des dizaines de groupes répartis sur plusieurs filières — la
// filière est l'échelon qui rend la sélection déterministe (RM-09).
//
// Chaque étage n'affiche que des valeurs réellement présentes dans le
// référentiel compte tenu des choix amont : un visiteur ne peut donc pas
// construire une combinaison vide en suivant l'interface.

type Etage = "ufr" | "filiere" | "niveau" | "groupe";

export function RechercheProgramme() {
  const router = useRouter();
  const [ufrs, setUfrs] = useState<Ufr[] | null>(null);
  const [filieres, setFilieres] = useState<string[] | null>(null);
  const [niveaux, setNiveaux] = useState<string[] | null>(null);
  const [groupes, setGroupes] = useState<GroupePublic[] | null>(null);

  const [ufr, setUfr] = useState<Ufr | null>(null);
  const [filiere, setFiliere] = useState<string | null>(null);
  const [niveau, setNiveau] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const etage: Etage = !ufr ? "ufr" : !filiere ? "filiere" : !niveau ? "niveau" : "groupe";

  useEffect(() => {
    apiFetch("/public/ufrs")
      .then((r) => r.json())
      .then((d) => setUfrs(d.ufrs))
      .catch(() => setErreur("Impossible de charger la liste des UFR. Vérifiez votre connexion."));
  }, []);

  // Les réinitialisations d'étage (`setFilieres(null)`...) sont faites dans
  // les gestionnaires de clic ci-dessous, jamais ici : appeler setState
  // au corps d'un effet déclenche un rendu en cascade, et surtout le geste
  // qui invalide un étage est bien le clic, pas le chargement qui s'ensuit.
  useEffect(() => {
    if (!ufr) return;
    apiFetch(`/public/filieres?ufrId=${encodeURIComponent(ufr.id)}`)
      .then((r) => r.json())
      .then((d) => setFilieres(d.filieres));
  }, [ufr]);

  useEffect(() => {
    if (!ufr || !filiere) return;
    apiFetch(`/public/niveaux?ufrId=${encodeURIComponent(ufr.id)}&filiere=${encodeURIComponent(filiere)}`)
      .then((r) => r.json())
      .then((d) => setNiveaux(d.niveaux));
  }, [ufr, filiere]);

  useEffect(() => {
    if (!ufr || !filiere || !niveau) return;
    const params = new URLSearchParams({ ufrId: ufr.id, filiere, niveau });
    apiFetch(`/public/groupes?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { groupes: GroupePublic[] }) => {
        // Un seul groupe possible : inutile de faire cliquer une fois de
        // plus sur une liste à un élément.
        if (d.groupes.length === 1) {
          router.push(`/programme/${d.groupes[0].id}`);
          return;
        }
        setGroupes(d.groupes);
      });
  }, [ufr, filiere, niveau, router]);

  // Choisir une valeur invalide tout ce qui en dépend : sans cela, revenir
  // en arrière puis choisir une autre UFR afficherait un instant les
  // filières de la précédente.
  function choisirUfr(id: string) {
    setUfr(ufrs?.find((u) => u.id === id) ?? null);
    setFilieres(null);
    setFiliere(null);
    setNiveaux(null);
    setNiveau(null);
    setGroupes(null);
  }

  function choisirFiliere(valeur: string) {
    setFiliere(valeur);
    setNiveaux(null);
    setNiveau(null);
    setGroupes(null);
  }

  function choisirNiveau(valeur: string) {
    setNiveau(valeur);
    setGroupes(null);
  }

  function revenirA(cible: Etage) {
    if (cible === "ufr") {
      setUfr(null);
      setFiliere(null);
      setNiveau(null);
    } else if (cible === "filiere") {
      setFiliere(null);
      setNiveau(null);
    } else if (cible === "niveau") {
      setNiveau(null);
    }
  }

  if (erreur) {
    return (
      <div className="rounded-xl border border-status-danger/30 bg-status-danger-bg p-6 text-center text-sm text-text">
        {erreur}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Fil d'Ariane : la cascade doit pouvoir se remonter, sinon un
          mauvais choix au 1er étage oblige à recharger la page. */}
      {ufr ? (
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-text-muted">
          <button onClick={() => revenirA("ufr")} className="rounded px-2 py-1 font-medium text-brand hover:bg-brand-light">
            {ufr.sigleAffiche}
          </button>
          {filiere ? (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-subtle" aria-hidden="true" />
              <button onClick={() => revenirA("filiere")} className="rounded px-2 py-1 font-medium text-brand hover:bg-brand-light">
                {filiere}
              </button>
            </>
          ) : null}
          {niveau ? (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-text-subtle" aria-hidden="true" />
              <button onClick={() => revenirA("niveau")} className="rounded px-2 py-1 font-medium text-brand hover:bg-brand-light">
                {niveau}
              </button>
            </>
          ) : null}
        </nav>
      ) : null}

      {/* [V3.2] « Établissement » et non « UFR » : l'UJKZ compte 6 instituts
          et 1 école doctorale en plus de ses 5 UFR. Un étudiant de l'IBAM à
          qui l'on demande « votre UFR » ne sait pas quoi répondre — et c'est
          la toute première étape du parcours. */}
      {etage === "ufr" ? (
        <Etape titre="Votre établissement" numero={1}>
          <Choix
            valeurs={ufrs?.map((u) => ({ cle: u.id, principal: u.sigleAffiche, secondaire: u.nom }))}
            onChoisir={choisirUfr}
          />
        </Etape>
      ) : null}

      {etage === "filiere" ? (
        <Etape titre="Votre filière (département)" numero={2}>
          <Choix
            valeurs={filieres?.map((f) => ({ cle: f, principal: f }))}
            onChoisir={choisirFiliere}
            vide="Aucune filière n'est encore enregistrée pour cette UFR."
          />
        </Etape>
      ) : null}

      {etage === "niveau" ? (
        <Etape titre="Votre niveau" numero={3}>
          <Choix
            valeurs={niveaux?.map((n) => ({ cle: n, principal: n }))}
            onChoisir={choisirNiveau}
            vide="Aucun niveau n'est encore enregistré pour cette filière."
          />
        </Etape>
      ) : null}

      {etage === "groupe" ? (
        <Etape titre="Votre groupe" numero={4}>
          <Choix
            valeurs={groupes?.map((g) => ({
              cle: g.id,
              principal: g.nom,
              // ERR-07 : distinguer, AVANT de cliquer, un programme rempli
              // d'un programme encore vide.
              secondaire:
                g.nbCreneaux > 0
                  ? `${g.anneeAcademique} · ${g.nbCreneaux} cours`
                  : `${g.anneeAcademique} · programme pas encore saisi`,
            }))}
            onChoisir={(cle) => router.push(`/programme/${cle}`)}
            vide="Aucun groupe ne correspond à cette combinaison."
          />
        </Etape>
      ) : null}
    </div>
  );
}

function Etape({ titre, numero, children }: { titre: string; numero: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {numero}
        </span>
        <h2 className="text-base font-semibold text-text">{titre}</h2>
      </div>
      {children}
    </section>
  );
}

function Choix({
  valeurs,
  onChoisir,
  vide,
}: {
  valeurs?: { cle: string; principal: string; secondaire?: string }[];
  onChoisir: (cle: string) => void;
  vide?: string;
}) {
  if (!valeurs) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-10 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (valeurs.length === 0) {
    // ERR-07 : le dire, plutôt que d'afficher une zone vide dans laquelle le
    // visiteur croirait que le site est cassé.
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
        <Search className="mx-auto mb-2 h-5 w-5 text-text-subtle" aria-hidden="true" />
        {vide ?? "Aucun résultat."}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {valeurs.map((v) => (
        <button
          key={v.cle}
          onClick={() => onChoisir(v.cle)}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-brand-light"
        >
          <span className="min-w-0">
            <span className="block truncate font-semibold text-text">{v.principal}</span>
            {v.secondaire ? <span className="block truncate text-xs text-text-muted">{v.secondaire}</span> : null}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
