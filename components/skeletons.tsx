import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Shared, content-shaped loading placeholders - every page's own
// loading-state branch (previously a centered Loader2 spinner) renders one of
// these instead, so the loading state roughly previews the layout that's
// about to appear instead of just spinning in the middle of empty space.

// One header row + N data rows, each cell a skeleton bar - stands in for any
// <Table> (invoices, projects, users, vendors, clients, ...) while its data
// is being fetched.
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Dashboard-style KPI tiles.
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Fills the space a chart/graph occupies while its data loads.
export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-64 w-full rounded-lg", className)} />;
}

// Label + input pairs, for add/edit form pages.
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

// Label/value pairs - detail modals/panels (invoice detail, project view, ...).
export function DetailSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

// Full dashboard-shell shape (icon rail + header + content) shown by
// AdminShell while it confirms the session/role via /api/auth/me, before it
// knows which nav items or user info to render - approximates the real
// SidebarProvider/AppSidebar/DashboardHeader layout closely enough that
// swapping in the real shell doesn't jump.
export function ShellSkeleton() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden md:flex w-16 flex-col items-center gap-4 border-r border-sidebar-border bg-sidebar py-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-lg" />
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex h-14 items-center justify-end gap-3 border-b border-border px-4 sm:px-6">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <StatCardsSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );
}
