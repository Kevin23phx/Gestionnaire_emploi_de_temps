import Link from "next/link";

export default function AidePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-brand hover:underline">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-text">Besoin d&apos;assistance ?</h1>
      <p className="mt-2 text-text-muted">
        Contactez le support technique de l&apos;université pour toute question sur
        votre compte ou votre emploi du temps.
      </p>

      <h2 id="donnees" className="mt-8 text-lg font-semibold text-text">
        Protection des données personnelles
      </h2>
      <p className="mt-2 text-text-muted">
        Campus Manager traite des données personnelles (identité, groupe,
        emploi du temps) conformément à la loi n°001-2021/AN portant
        protection des données à caractère personnel du Burkina Faso. Pour
        toute question relative à vos données, contactez la scolarité de
        votre UFR.
      </p>
    </div>
  );
}
