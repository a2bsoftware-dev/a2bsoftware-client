import React from "react";
import AdminShell from "@/components/admin-shell";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
