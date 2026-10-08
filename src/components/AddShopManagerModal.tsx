import { useState } from "react";
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
import { Store, Loader2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";

type AddShopManagerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetOwnerId?: string;
};

export function AddShopManagerModal({
  open,
  onOpenChange,
  targetOwnerId,
}: AddShopManagerModalProps) {
  const { addShopManager, shops } = useBusiness();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const created = await addShopManager({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        shopId: shopId || (shops.length > 0 ? shops[0].id : undefined),
        ownerId: targetOwnerId,
      });

      toast({
        title: "Shop Manager Added",
        description: `Successfully added Shop Manager ${created.name}.`,
      });

      // Reset & close
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setShopId("");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to add Shop Manager.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-secondary mb-1">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Store className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Add Shop Manager</DialogTitle>
          </div>
          <DialogDescription>
            Create a new Shop Manager account assigned to manage a specific shop location.
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
              <Label htmlFor="mgr-name">Manager Name *</Label>
              <Input
                id="mgr-name"
                placeholder="e.g. Anil Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mgr-email">Email Address *</Label>
              <Input
                id="mgr-email"
                type="email"
                placeholder="e.g. manager@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mgr-password">Account Password *</Label>
              <Input
                id="mgr-password"
                type="password"
                placeholder="Min 6 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mgr-phone">Contact Phone</Label>
              <Input
                id="mgr-phone"
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {shops.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="mgr-shop">Assigned Shop Location</Label>
              <select
                id="mgr-shop"
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
              Create Shop Manager
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
