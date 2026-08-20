// Insensible aux accents : une recherche doit trouver "Réseaux" même tapée
// "reseaux" (clavier sans accents, saisie rapide) — utilisé par toute
// recherche texte de l'appli (cours, étudiants...).
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase();
}
