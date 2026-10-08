import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";
import { fetchVisibility, setVisibility, type PageVisibility } from "@/lib/api";
import { useRealtime } from "@/lib/socket";

type ControlledRole = "owner";

// Pages the analyst can hand out / take away for the Business Owner. We only
// manage pages that the owner can reach, and never the analyst's own admin tools.
const MANAGED_PAGES = navItems.filter(
  (item) => item.roles.includes("owner") && !item.url.startsWith("/analyst")
);

export default function AnalystVisibility() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  // Map of `${pageUrl}:${role}` -> visible. Absent = visible (default).
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const load = useCallback(async () => {
    try {
      const rows = await fetchVisibility("owner");
      const map = new Map<string, boolean>();
      rows.forEach((r: PageVisibility) => map.set(`${r.pageUrl}:${r.role}`, r.visible));
      setOverrides(map);
    } catch {
      toast.error("Failed to load page access settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Stay in sync if another analyst session changes settings.
  useRealtime("visibility", load);

  const isVisible = useCallback(
    (pageUrl: string, role: ControlledRole) => overrides.get(`${pageUrl}:${role}`) ?? true,
    [overrides]
  );

  const toggle = async (pageUrl: string, role: ControlledRole, next: boolean) => {
    const key = `${pageUrl}:${role}`;
    setSavingKey(key);
    // Optimistic update.
    setOverrides((prev) => new Map(prev).set(key, next));
    try {
      await setVisibility(pageUrl, role, next);
      toast.success(
        `Business Owner can ${next ? "now see" : "no longer see"} this page`
      );
    } catch {
      toast.error("Failed to update access");
      // Revert on failure.
      setOverrides((prev) => new Map(prev).set(key, !next));
    } finally {
      setSavingKey(null);
    }
  };

  const hiddenCount = useMemo(
    () => [...overrides.values()].filter((v) => !v).length,
    [overrides]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Lock className="h-6 w-6 text-primary" />
          Business Owner Page Access Control
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which pages the Business Owner can see. Hiding a page removes it from their navigation in real time.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 p-4">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-primary">
          Pages are visible by default. {hiddenCount > 0 && (
            <strong>{hiddenCount} override(s) currently hiding pages for Business Owner.</strong>
          )}
        </p>
      </div>

      {loading ? (
        <div className="glow-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <div className="glow-card overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Page</span>
            <span className="w-28 text-center">👔 Owner Access</span>
          </div>

          {MANAGED_PAGES.map((page, i) => {
            const Icon = page.icon;
            const role: ControlledRole = "owner";
            const visible = isVisible(page.url, role);
            const key = `${page.url}:${role}`;

            return (
              <motion.div
                key={page.url}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 items-center border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                  </div>
                </div>

                <div className="w-28 flex items-center justify-center gap-2">
                  {savingKey === key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : visible ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Switch
                    checked={visible}
                    disabled={savingKey === key}
                    onCheckedChange={(next) => toggle(page.url, role, next)}
                    className={cn(!visible && "data-[state=unchecked]:bg-muted")}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
