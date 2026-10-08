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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Loader2 } from "lucide-react";
import { type ShopManager, updateShopManagerProfile, useBusiness } from "@/contexts/BusinessContext";
import { updateShopManagerProfile as apiUpdateShopManager } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type EditShopManagerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: ShopManager | null;
  onUpdated?: () => void;
};

export function EditShopManagerModal({
  open,
  onOpenChange,
  manager,
  onUpdated,
}: EditShopManagerModalProps) {
  const { shops, refreshShopManagers } = useBusiness();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && manager) {
      setName(manager.name || "");
      setEmail(manager.email || "");
      setPhone(manager.phone || "");
      setShopId(manager.shopId || "");
      setPassword("");
      setError("");
    }
  }, [open, manager]);

  if (!manager) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (password && password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await apiUpdateShopManager(manager.managerId, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        shopId: shopId || undefined,
        password: password || undefined,
      });

      toast({
        title: "Profile Updated",
        description: `Successfully updated profile for ${name}.`,
      });

      await refreshShopManagers();
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Edit Shop Manager Profile</DialogTitle>
          </div>
          <DialogDescription>
            Update account details, phone number, or shop assignment for {manager.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Manager Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address *</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Contact Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Leave blank to keep current"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {shops.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-shop">Assigned Shop Location</Label>
              <select
                id="edit-shop"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a Shop...</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.location ? `(${s.location})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
