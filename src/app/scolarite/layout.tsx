import { RoleGuardShell } from "@/components/layout/RoleGuardShell";

export default function ScolariteLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuardShell role="scolarite">{children}</RoleGuardShell>;
}
