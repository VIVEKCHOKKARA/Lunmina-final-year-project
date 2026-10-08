/**
 * Route-level access control. Enforces:
 *   1. Role access control (navItems.roles).
 *   2. Financial Analyst visibility overrides.
 *   3. Shop Manager individual page permissions (managed per-manager by Business Owner).
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";
import { navItems } from "@/lib/navigation";
import { useRole } from "@/contexts/RoleContext";
import { fetchVisibility, fetchMyPermissions, type ManagerPermissionsMap } from "@/lib/api";
import { useRealtime } from "@/lib/socket";

function Denied({ reason }: { reason: string }) {
  return (
    <div className="glow-card p-12 text-center max-w-md mx-auto mt-12 space-y-4">
      <div className="p-3 rounded-full bg-destructive/10 text-destructive w-fit mx-auto">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-2">{reason}</p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const { role } = useRole();
  const location = useLocation();

  const [hiddenPages, setHiddenPages] = useState<Set<string>>(new Set());
  const [managerPermissions, setManagerPermissions] = useState<ManagerPermissionsMap | null>(null);

  const loadVisibility = useCallback(async () => {
    if (role === "analyst") {
      setHiddenPages(new Set());
      return;
    }
    try {
      const rows = await fetchVisibility(role);
      setHiddenPages(new Set(rows.filter((r) => !r.visible).map((r) => r.pageUrl)));
    } catch {
      setHiddenPages(new Set());
    }
  }, [role]);

  const loadManagerPermissions = useCallback(async () => {
    if (role !== "manager") {
      setManagerPermissions(null);
      return;
    }
    try {
      const perms = await fetchMyPermissions();
      setManagerPermissions(perms);
    } catch {
      setManagerPermissions(null);
    }
  }, [role]);

  useEffect(() => {
    loadVisibility();
    loadManagerPermissions();
  }, [loadVisibility, loadManagerPermissions]);

  useRealtime("visibility", loadVisibility);
  useRealtime("permissions", loadManagerPermissions);

  const item = navItems.find((n) => n.url === location.pathname);

  // Unknown routes (e.g. 404) are not gated here — let them render.
  if (!item) return <>{children}</>;

  if (!item.roles.includes(role)) {
    return <Denied reason={`The ${role} role doesn't have access to this page.`} />;
  }

  if (hiddenPages.has(item.url)) {
    return <Denied reason="The Financial Analyst has hidden this page for your role." />;
  }

  // Individual Shop Manager permission check
  if (role === "manager" && managerPermissions !== null) {
    const isAllowed = managerPermissions[location.pathname];
    if (isAllowed === false) {
      return (
        <Denied reason="You do not have permission to access this page. Contact your Business Owner to request access." />
      );
    }
  }

  return <>{children}</>;
}
