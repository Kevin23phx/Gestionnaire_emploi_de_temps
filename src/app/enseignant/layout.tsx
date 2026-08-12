import { RoleGuardShell } from "@/components/layout/RoleGuardShell";

export default function EnseignantLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuardShell role="enseignant">{children}</RoleGuardShell>;
}
