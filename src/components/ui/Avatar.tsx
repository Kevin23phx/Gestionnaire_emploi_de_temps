// Avatar générique par initiales — jamais de photo (cohérence design system, cf. maquettes Stitch).
export function Avatar({ nom, prenom }: { nom: string; prenom: string }) {
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand"
      aria-hidden="true"
    >
      {initiales}
    </div>
  );
}
