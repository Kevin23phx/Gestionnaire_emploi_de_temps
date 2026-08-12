import { RoleGuardShell } from "@/components/layout/RoleGuardShell";

export default function EtudiantLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuardShell role="etudiant">{children}</RoleGuardShell>;
}
