"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/hooks/use-logout";
import { LayoutDashboard, FolderKanban, LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from "@/components/ui/sidebar";

interface User {
  id: string;
  user_name?: string;
  name?: string;
  email: string;
  role_id: string;
  role?: string;
  permissions?: number[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  visible: boolean;
}

export function AppSidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const handleLogout = useLogout();

  // Same moduleId scheme + role/permission system a2bsoftware-frontend's own
  // sidebar uses (Dashboard=1, Projects=6) - the "Clients" role is already
  // seeded with view-only access to exactly these two, via the same
  // ClientUserPriv/AccessControlService /api/auth/me already returns
  // permissions from for any role, not something specific to this app.
  const hasAccess = (moduleId: number) => user?.permissions?.includes(moduleId) ?? false;

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, visible: hasAccess(1) },
    { name: "Projects", href: "/projects", icon: FolderKanban, visible: hasAccess(6) }
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex h-8 items-center overflow-hidden px-2 py-1.5"
        >
          <Image
            src="/logo.png"
            alt="A2B"
            width={160}
            height={32}
            className="h-full w-auto max-w-full object-contain object-left"
          />
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems
                .filter((item) => item.visible)
                .map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={pathname === item.href}
                        tooltip={item.name}
                      >
                        <IconComponent />
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="gap-1">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <div className="flex flex-col overflow-hidden px-2 py-1.5">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.user_name || user?.name || user?.email || "Client User"}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {user?.role || "Client"}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Logout"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
