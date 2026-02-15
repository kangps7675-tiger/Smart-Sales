import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardAuthGuard } from "@/components/dashboard/dashboard-auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGuard>
  );
}
