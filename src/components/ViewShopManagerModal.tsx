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
import {
  User,
  Mail,
  Phone,
  Store,
  ShieldCheck,
  Edit,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  type ShopManager,
  type ManagerPermissionsMap,
  fetchShopManagerPermissions,
  deleteShopManager,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type ViewShopManagerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: ShopManager | null;
  onEdit: (manager: ShopManager) => void;
  onManageAccess: (manager: ShopManager) => void;
  onDeleted?: () => void;
};

const FEATURE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Sales & Ledger",
  "/products": "Products Catalog",
  "/forecasting": "Forecasting",
  "/anomalies": "Anomaly Detection",
  "/pricing": "Dynamic Pricing",
  "/chat": "AI Advisor",
  "/simulate": "Profit Simulator",
  "/insights": "AI Insights",
  "/tutorials": "Video Tutorials",
};

export function ViewShopManagerModal({
  open,
  onOpenChange,
  manager,
  onEdit,
  onManageAccess,
  onDeleted,
}: ViewShopManagerModalProps) {
  const [permissions, setPermissions] = useState<ManagerPermissionsMap>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && manager) {
      setLoading(true);
      fetchShopManagerPermissions(manager.managerId)
        .then((res) => setPermissions(res.permissions || {}))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, manager]);

  if (!manager) return null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove Shop Manager ${manager.name}? This will revoke their account access.`)) {
      return;
    }
    try {
      setDeleting(true);
      await deleteShopManager(manager.managerId);
      toast({
        title: "Manager Removed",
        description: `Successfully removed ${manager.name}.`,
      });
      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove manager.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-secondary/15 text-secondary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{manager.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Shop Manager Profile & Feature Access Summary
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Profile details card */}
          <div className="p-4 rounded-xl bg-accent/30 border border-border/60 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email:
              </span>
              <span className="font-semibold text-foreground">{manager.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Phone:
              </span>
              <span className="font-medium text-foreground">{manager.phone || "Not provided"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-primary" /> Assigned Shop:
              </span>
              <span className="font-bold text-foreground">{manager.shopName || "Main Branch"}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Active Manager
              </span>
            </div>
          </div>

          {/* Feature Access Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Current Feature Permissions
            </h4>

            {loading ? (
              <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading permissions...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(FEATURE_NAMES).map(([url, title]) => {
                  const enabled = Boolean(permissions[url]);
                  return (
                    <div
                      key={url}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                        enabled
                          ? "bg-primary/10 border-primary/30 text-foreground"
                          : "bg-muted/30 border-border/40 text-muted-foreground opacity-60"
                      }`}
                    >
                      <span className="truncate">{title}</span>
                      {enabled ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5 text-xs font-bold"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Remove Manager
          </Button>

          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(manager);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onManageAccess(manager);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Manage Access
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
