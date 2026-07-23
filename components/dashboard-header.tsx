"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";

interface User {
  id: string;
  user_name?: string;
  name?: string;
  email: string;
  role?: string;
}

export default function DashboardHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center border-b border-border bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="ml-auto flex items-center gap-3">
        <div className="flex flex-col text-right">
          <span className="text-sm font-semibold text-foreground">
            {user?.user_name || user?.name || user?.email || "Client User"}
          </span>
          <span className="text-xs text-muted-foreground">{user?.role || "Client"}</span>
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}
