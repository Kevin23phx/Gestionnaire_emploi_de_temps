import { RoleGuardShell } from "@/components/layout/RoleGuardShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuardShell role="admin">{children}</RoleGuardShell>;
}
