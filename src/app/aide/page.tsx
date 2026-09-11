import Link from "next/link";

export default function AidePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-brand hover:underline">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-text">Besoin d&apos;assistance ?</h1>
      <p className="mt-2 text-text-muted">
        Contactez le support technique de l&apos;université pour toute question sur votre emploi du temps.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-text">Consulter un emploi du temps</h2>
      <p className="mt-2 text-text-muted">
        Aucun compte n&apos;est nécessaire. Depuis l&apos;accueil, choisissez votre établissement (UFR, institut ou
        école doctorale), votre département puis votre
        niveau : le programme de votre groupe s&apos;affiche. Vous pouvez ensuite le garder en favori sur votre
        appareil, ou l&apos;ajouter à l&apos;agenda de votre téléphone pour recevoir automatiquement les
        changements.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-text">Signaler une absence (enseignants)</h2>
      <p className="mt-2 text-text-muted">
        Les enseignants n&apos;ont pas de compte sur Campus Manager. En cas d&apos;absence ou de demande de
        report, contactez directement la scolarité de votre établissement : elle corrige le programme, et le changement
        parvient aussitôt aux étudiants.
      </p>

      <h2 id="donnees" className="mt-8 text-lg font-semibold text-text">
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
          intitulé du cours, salle, horaire, statut de la séance, et <span className="font-medium">nom de
          l&apos;enseignant</span> qui l&apos;assure. Ces informations sont accessibles sans compte, comme elles
          le sont déjà sur les tableaux d&apos;affichage des UFR.
        </li>
        <li>
          <span className="font-medium text-text">Ce qui ne l&apos;est pas :</span> aucune donnée nominative
          d&apos;étudiant. Ni INE, ni nom, ni liste des inscrits d&apos;un groupe ne sont accessibles depuis les
          pages publiques ; ces données restent réservées à la scolarité de l&apos;UFR concernée.
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
