"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/hooks/use-logout";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  KeyRound,
  Link2,
  FileCode,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronRight
} from "lucide-react";

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";

interface User {
  id: string;
  user_name?: string;
  name?: string;
  email: string;
  role_id: string;
  role?: string;
  permissions?: number[];
}

interface NavChild {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  visible: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  visible: boolean;
  children?: NavChild[];
}

export function AppSidebar({
  user,
  showClientApi,
  showSetting
}: {
  user: User | null;
  showClientApi: boolean;
  showSetting: boolean;
}) {
  const pathname = usePathname();

  // Helper check for active privilege in database
  const hasAccess = (moduleId: number) => {
    if (!user) return false;
    // Fallback: If permissions not initialized yet, allow Admin access to all
    if (!user.permissions) return user.role === "Admin";
    return user.permissions.includes(moduleId);
  };

  // Configure navigation tabs linked to legacy privilege IDs
  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, visible: hasAccess(1) },
    { name: "Projects", href: "/projects", icon: FolderKanban, visible: hasAccess(6) },
    { name: "Users", href: "/users", icon: Users, visible: hasAccess(10) },
    {
      name: "Clients",
      href: "/clients",
      icon: Building2,
      visible: hasAccess(14),
      children: [
        { name: "Links", href: "/clients/links", icon: Link2, visible: hasAccess(19) },
        {
          name: "Client Api Data",
          href: "/client-api-data",
          icon: FileCode,
          visible: hasAccess(20) && showClientApi
        }
      ]
    },
    { name: "Vendors", href: "/vendors", icon: KeyRound, visible: hasAccess(18) },
    { name: "Access Rights", href: "/access-rights", icon: ShieldAlert, visible: hasAccess(21) },
    {
      name: "Settings",
      href: "/setting",
      icon: Settings,
      visible: hasAccess(21) && showSetting
    }
  ];

  const handleLogout = useLogout();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex h-8 items-center overflow-hidden px-2 py-1.5"
        >
          <img
            src="/logo.png"
            alt="A2B"
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
                  const visibleChildren = item.children?.filter((c) => c.visible) ?? [];
                  const isActive = pathname === item.href;
                  const childActive = visibleChildren.some((c) => pathname === c.href);
                  const IconComponent = item.icon;

                  if (visibleChildren.length > 0) {
                    return (
                      <Collapsible
                        key={item.name}
                        defaultOpen={isActive || childActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger
                            render={
                              <SidebarMenuButton
                                isActive={isActive || childActive}
                              />
                            }
                          >
                            <IconComponent />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[panel-open]/collapsible:rotate-90" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="mt-1 gap-1">
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  render={<Link href={item.href} />}
                                  isActive={isActive}
                                >
                                  <span>All {item.name}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {visibleChildren.map((child) => {
                                const ChildIcon = child.icon;
                                return (
                                  <SidebarMenuSubItem key={child.name}>
                                    <SidebarMenuSubButton
                                      render={<Link href={child.href} />}
                                      isActive={pathname === child.href}
                                    >
                                      <ChildIcon />
                                      <span>{child.name}</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
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
                {user?.user_name || user?.name || user?.email || "Admin User"}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {user?.role === "Admin" ? "Administrator" : user?.role || "Manager"}
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
