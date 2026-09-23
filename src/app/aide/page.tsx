import Link from "next/link";
import { getSession } from "@/lib/session";

// [V8.3, 2026-09-23] Page d'aide — mise à jour des réformes V8 (niveau /
// spécialité), V8.1 (affectation d'un créneau à une spécialité) et
// FR-AUTH-07 (mot de passe).
//
// ## Une page, deux publics
//
// Cette page est PUBLIQUE (lien en pied de l'accueil) et c'est aussi celle
// que le Gestionnaire ouvre depuis sa barre latérale. La partie
// gestionnaire n'est donc rendue que si une session existe : non pas pour
// la protéger — elle ne contient aucun secret — mais parce qu'elle
// répondrait à des questions qu'un étudiant ne se pose pas, et qu'elle
// noierait ce qu'il est venu chercher.
//
// ## Ce que cette page ne dit PAS, et ne doit jamais dire
//
// Rien sur l'emplacement de l'espace d'administration, rien sur le geste
// qui ouvre la connexion depuis l'accueil (NFR-SEC-04/05, INT-12). Une
// page d'aide publique est le premier endroit que lit quelqu'un qui
// cartographie un site : tout ce qu'on y écrit sur les accès internes
// annule le travail de dissimulation fait par ailleurs. Les dix personnes
// concernées l'apprennent de vive voix, pas ici.
export default async function AidePage() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-brand hover:underline">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-text">Besoin d&apos;assistance ?</h1>
      <p className="mt-2 text-text-muted">
        Contactez le support technique de l&apos;université pour toute question sur votre emploi du temps.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-text">Trouver son emploi du temps</h2>
      <p className="mt-2 text-text-muted">
        Aucun compte n&apos;est nécessaire. Depuis l&apos;accueil, renseignez dans l&apos;ordre :
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-text-muted">
        <li>
          votre <span className="font-medium text-text">année académique</span> ;
        </li>
        <li>
          votre <span className="font-medium text-text">établissement</span> — UFR, institut ou école
          doctorale ;
        </li>
        <li>
          votre <span className="font-medium text-text">département</span> ;
        </li>
        <li>
          votre <span className="font-medium text-text">niveau</span> — L1, L2, L3, M1 ou M2 ;
        </li>
        <li>
          votre <span className="font-medium text-text">spécialité</span>, si votre niveau en propose une.
        </li>
      </ol>
      <p className="mt-3 text-text-muted">
        Cliquez ensuite sur <span className="font-medium text-text">Actualiser</span> : votre programme
        s&apos;affiche — ou, s&apos;il n&apos;est pas encore publié, la page vous le dit en toutes lettres
        plutôt que de vous laisser devant une grille vide.
      </p>

      {/* [V8] La réforme la plus visible pour l'étudiant : ce que l'écran
          appelait « parcours » était en réalité le niveau, et le vrai
          parcours n'existait pas. Expliqué par l'exemple plutôt que par la
          définition — c'est le cas concret qui fait comprendre la règle. */}
      <h2 className="mt-8 text-lg font-semibold text-text">Niveau et spécialité : quelle différence ?</h2>
      <p className="mt-2 text-text-muted">
        Le <span className="font-medium text-text">niveau</span> est votre année dans le cycle LMD : L1, L2,
        L3, M1, M2. La <span className="font-medium text-text">spécialité</span> est le choix que vous faites
        à l&apos;intérieur de votre département.
      </p>
      <p className="mt-2 text-text-muted">
        Une même filière peut être commune une année et se diviser l&apos;année suivante. En première année,
        tous les étudiants suivent les mêmes cours : c&apos;est un{" "}
        <span className="font-medium text-text">tronc commun</span>, et la liste « Spécialité » reste alors
        grisée — il n&apos;y a rien à choisir, ce n&apos;est pas une erreur. À partir de la deuxième année, la
        promotion se répartit entre plusieurs spécialités, et la liste s&apos;active.
      </p>
      <p className="mt-2 text-text-muted">
        Si vous ne savez pas quelle spécialité choisir, c&apos;est celle dans laquelle vous êtes inscrit auprès
        de la scolarité de votre établissement.
      </p>

      {/* [V8.1] Conséquence directe de l'affectation par créneau : le
          programme d'un étudiant n'est pas « les cours de sa spécialité »,
          c'est « les cours communs PLUS ceux de sa spécialité ». Sans cette
          explication, un étudiant qui voit de l'anatomie dans un programme
          d'informatique croit à une erreur. */}
      <h2 className="mt-8 text-lg font-semibold text-text">Ce que contient votre programme</h2>
      <p className="mt-2 text-text-muted">
        Une fois votre spécialité choisie, votre programme réunit{" "}
        <span className="font-medium text-text">deux sortes de cours</span> :
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
        <li>
          les <span className="font-medium text-text">cours communs</span>, suivis par toute votre promotion,
          quelle que soit la spécialité — ils n&apos;affichent aucune mention particulière ;
        </li>
        <li>
          les <span className="font-medium text-text">cours de votre spécialité</span>, signalés par son nom
          sous la salle et l&apos;enseignant.
        </li>
      </ul>
      <p className="mt-3 text-text-muted">
        Les cours des autres spécialités ne vous sont jamais affichés. C&apos;est normal que deux spécialités
        aient cours à la même heure : ce sont des étudiants différents, dans des salles différentes.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-text">Garder son programme</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
        <li>
          <span className="font-medium text-text">En favori</span> — il vous attend sur la page
          d&apos;accueil, sans refaire la recherche. Votre spécialité est conservée avec lui.
        </li>
        <li>
          <span className="font-medium text-text">Dans votre agenda</span> — ajoutez-le une fois à l&apos;agenda
          de votre téléphone : annulations et changements de salle y arrivent ensuite tout seuls. L&apos;adresse
          d&apos;abonnement est propre à votre spécialité, ne la partagez donc qu&apos;avec des camarades de la
          même.
        </li>
        <li>
          <span className="font-medium text-text">Hors connexion</span> — le dernier programme consulté reste
          lisible sans réseau, avec la date de la copie affichée en haut.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-text">Une séance barrée ou signalée</h2>
      <p className="mt-2 text-text-muted">
        Une séance annulée ou déplacée <span className="font-medium text-text">reste affichée</span>, barrée et
        accompagnée de son motif, au lieu de disparaître. C&apos;est délibéré : une séance qui s&apos;efface
        silencieusement est la meilleure façon de vous faire venir pour rien.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-text">Signaler une absence (enseignants)</h2>
      <p className="mt-2 text-text-muted">
        Les enseignants n&apos;ont pas de compte sur Campus Manager. En cas d&apos;absence ou de demande de
        report, contactez directement la scolarité de votre établissement : elle corrige le programme, et le
        changement parvient aussitôt aux étudiants.
      </p>

      {session ? (
        <>
          <hr className="mt-10 border-border" />
          <h2 className="mt-8 text-lg font-semibold text-text">Pour la scolarité</h2>
          <p className="mt-2 text-sm text-text-subtle">
            Cette partie ne s&apos;affiche que lorsque vous êtes connecté.
          </p>

          <h3 className="mt-6 font-semibold text-text">Déclarer les spécialités</h3>
          <p className="mt-2 text-text-muted">
            Section <span className="font-medium text-text">Spécialités</span>. Choisissez un département{" "}
            <span className="font-medium text-text">et</span> un niveau : une spécialité appartient au couple
            des deux, jamais au département seul. C&apos;est ce qui permet à une filière d&apos;être un tronc
            commun en L1 et de se diviser en L2.
          </p>
          <p className="mt-2 text-text-muted">
            Vous pouvez en saisir plusieurs d&apos;un coup en les séparant par des{" "}
            <span className="font-medium text-text">virgules</span> : chacune devient une entrée distincte.
            Laissez la liste vide pour un niveau de tronc commun — c&apos;est un état normal, pas un oubli.
          </p>

          <h3 className="mt-6 font-semibold text-text">Un seul groupe, des cours affectés</h3>
          <p className="mt-2 text-text-muted">
            Ne créez <span className="font-medium text-text">pas</span> un groupe par spécialité. Créez un
            groupe unique — « L2 Médecine » — puis affectez chaque créneau : un cours laissé sur{" "}
            <span className="font-medium text-text">Tout le groupe</span> concerne toute la promotion, un cours
            affecté à une spécialité ne concerne qu&apos;elle. Le tronc commun n&apos;est ainsi saisi
            qu&apos;une fois, et une correction d&apos;horaire ne se fait qu&apos;une fois.
          </p>
          <p className="mt-2 text-text-muted">
            Choisissez la spécialité <span className="font-medium text-text">avant</span> de saisir : depuis la
            liste des programmes, cliquez directement sur son nom dans la carte du groupe. La feuille
            s&apos;ouvre sur cette vue, et vos nouveaux créneaux lui sont affectés par défaut. Le chiffre à côté
            de chaque spécialité indique combien de cours lui sont déjà affectés.
          </p>

          <h3 className="mt-6 font-semibold text-text">Conflits et spécialités</h3>
          <p className="mt-2 text-text-muted">
            Deux cours de <span className="font-medium text-text">spécialités différentes</span> à la même heure
            ne sont pas un conflit : ce sont deux publics disjoints. En revanche, un cours commun et un cours de
            spécialité au même moment en sont un — les étudiants de cette spécialité sont attendus aux deux. La
            salle et l&apos;enseignant, eux, restent bloqués dans tous les cas.
          </p>
          <p className="mt-2 text-text-muted">
            L&apos;alerte de capacité compare la salle à l&apos;effectif de{" "}
            <span className="font-medium text-text">toute la promotion</span> : sur un cours de spécialité, elle
            surestime donc le nombre réel d&apos;étudiants attendus. Le message le précise.
          </p>

          <h3 className="mt-6 font-semibold text-text">Changer son mot de passe</h3>
          <p className="mt-2 text-text-muted">
            Cliquez sur <span className="font-medium text-text">votre nom</span>, en bas de la barre latérale.
            Le mot de passe actuel est demandé même si vous êtes déjà connecté : c&apos;est ce qui empêche
            qu&apos;un poste laissé ouvert suffise à prendre le contrôle de votre compte. Huit caractères
            minimum.
          </p>
          <p className="mt-2 text-text-muted">
            Après le changement, vous restez connecté ici, mais toute session ouverte sur un autre appareil est
            fermée. Si vous avez oublié votre mot de passe, seule l&apos;administration peut réinitialiser le
            compte.
          </p>

          <h3 className="mt-6 font-semibold text-text">Passage à l&apos;année supérieure</h3>
          <p className="mt-2 text-text-muted">
            Section <span className="font-medium text-text">Promotions</span>. Le Système propose le niveau
            suivant et reprend l&apos;effectif actuel, mais ne décide rien : corrigez l&apos;effectif, il ne
            diminue jamais tout seul. Le groupe d&apos;origine n&apos;est jamais modifié, il reste comme
            historique.
          </p>
          <p className="mt-2 text-text-muted">
            La spécialité du groupe cible n&apos;est <span className="font-medium text-text">pas</span> reprise
            de la source : c&apos;est justement l&apos;année où une promotion de tronc commun se divise. Un
            groupe ne peut être promu qu&apos;une fois — si votre L1 devient plusieurs L2, promouvez-la vers la
            première spécialité puis créez les autres groupes à la main.
          </p>
        </>
      ) : null}

      <h2 id="donnees" className="mt-10 text-lg font-semibold text-text">
        Protection des données personnelles
      </h2>
      <p className="mt-2 text-text-muted">
        Campus Manager traite des données personnelles conformément à la loi n°001-2021/AN portant protection des
        données à caractère personnel du Burkina Faso. Pour toute question relative à vos données, contactez la
        scolarité de votre établissement.
      </p>

      {/* NFR-LEGAL-01 [V3] : la publication du nom des enseignants reproduit
          ce que font déjà les tableaux d'affichage des UFR, mais elle change
          d'échelle en devenant consultable en ligne — elle doit donc être
          déclarée explicitement, et non seulement constatée. */}
      <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
        <li>
          <span className="font-medium text-text">Ce qui est public :</span> les emplois du temps eux-mêmes —
          intitulé du cours, salle, horaire, statut de la séance, spécialité concernée, et{" "}
          <span className="font-medium">nom de l&apos;enseignant</span> qui l&apos;assure. Ces informations sont
          accessibles sans compte, comme elles le sont déjà sur les tableaux d&apos;affichage des UFR.
        </li>
        <li>
          <span className="font-medium text-text">Ce qui ne l&apos;est pas :</span> aucune donnée nominative
          d&apos;étudiant. Campus Manager n&apos;enregistre d&apos;ailleurs ni INE, ni nom, ni liste des inscrits :
          seul l&apos;effectif d&apos;un groupe est connu, pour vérifier la capacité des salles, et il n&apos;est
          jamais publié. Une spécialité désigne une branche d&apos;enseignement, jamais une personne.
        </li>
        <li>
          <span className="font-medium text-text">Ce que le site retient de vous :</span> rien sur nos serveurs.
          Vos programmes favoris sont enregistrés dans votre navigateur, sur votre appareil uniquement. Si vous
          activez les alertes, seule une adresse technique fournie par votre navigateur est conservée, sans lien
          avec votre identité — vous pouvez la supprimer à tout moment en désactivant l&apos;alerte.
        </li>
      </ul>
    </div>
  );
}
