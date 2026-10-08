import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck,
  Loader2,
  RotateCcw,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Wand2,
  Lightbulb,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import {
  type ManagerPermissionsMap,
  fetchShopManagerPermissions,
  updateShopManagerPermissions,
  resetShopManagerPermissions,
  type ShopManager,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type ManagePermissionsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: ShopManager | null;
  onPermissionsUpdated?: () => void;
};

type FeatureItem = {
  url: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const FEATURES: FeatureItem[] = [
  { url: "/", title: "Dashboard", description: "Overview metrics, KPIs, and operational status", icon: LayoutDashboard },
  { url: "/transactions", title: "Transactions & Sales", description: "View and record income & expense transactions", icon: Receipt },
  { url: "/products", title: "Products & Catalog", description: "Product inventory, pricing, and units sold", icon: ShoppingBag },
  { url: "/forecasting", title: "Forecasting", description: "AI revenue and expense predictions", icon: TrendingUp },
  { url: "/anomalies", title: "Anomaly Detection", description: "ML detection of unusual transaction spikes or dips", icon: AlertTriangle },
  { url: "/pricing", title: "Dynamic Pricing", description: "XGBoost pricing recommendations and approval workflow", icon: DollarSign },
  { url: "/chat", title: "AI Business Advisor", description: "Multilingual AI assistant for shop advice", icon: MessageSquare },
  { url: "/simulate", title: "Profit Simulator", description: "Model strategic growth and slider scenarios", icon: Wand2 },
  { url: "/insights", title: "AI Insights", description: "Executive summary and business recommendations", icon: Lightbulb },
  { url: "/tutorials", title: "Video Tutorials", description: "Access business learning hub videos", icon: PlayCircle },
];

export function ManagePermissionsModal({
  open,
  onOpenChange,
  manager,
  onPermissionsUpdated,
}: ManagePermissionsModalProps) {
  const [permissions, setPermissions] = useState<ManagerPermissionsMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (open && manager) {
      setLoading(true);
      fetchShopManagerPermissions(manager.managerId)
        .then((res) => {
          setPermissions(res.permissions || {});
        })
        .catch((err) => {
          toast({
            title: "Error",
            description: "Failed to load manager permissions.",
            variant: "destructive",
          });
        })
        .finally(() => setLoading(false));
    }
  }, [open, manager]);

  if (!manager) return null;

  const handleToggle = (url: string) => {
    setPermissions((prev) => ({
      ...prev,
      [url]: !prev[url],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateShopManagerPermissions(manager.managerId, permissions);
      toast({
        title: "Permissions Updated",
        description: `Updated access permissions for ${manager.name}. Changes take effect immediately.`,
      });
      if (onPermissionsUpdated) onPermissionsUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save permissions.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset permissions for ${manager.name} to default settings?`)) return;
    try {
      setResetting(true);
      const res = await resetShopManagerPermissions(manager.managerId);
      setPermissions(res.permissions);
      toast({
        title: "Permissions Reset",
        description: `Default permissions restored for ${manager.name}.`,
      });
      if (onPermissionsUpdated) onPermissionsUpdated();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reset permissions.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col bg-card text-card-foreground border-border p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Manage Access — {manager.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Shop Manager: <span className="font-semibold text-foreground">{manager.email}</span> • Shop: <span className="font-semibold text-foreground">{manager.shopName || "Main Branch"}</span>
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={loading || resetting || saving}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title="Restore default manager permissions"
            >
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reset Defaults
            </Button>
          </div>
        </DialogHeader>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading permission configuration...
            </div>
          ) : (
            FEATURES.map((feat) => {
              const enabled = Boolean(permissions[feat.url]);
              const Icon = feat.icon;
              return (
                <div
                  key={feat.url}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    enabled
                      ? "bg-card border-primary/40 shadow-xs"
                      : "bg-accent/20 border-border/60 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3 pr-4">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{feat.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          enabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {enabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{feat.description}</p>
                    </div>
                  </div>

                  <Switch
                    checked={enabled}
                    onCheckedChange={() => handleToggle(feat.url)}
                  />
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border shrink-0 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving} className="gap-2 font-bold">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Access Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
