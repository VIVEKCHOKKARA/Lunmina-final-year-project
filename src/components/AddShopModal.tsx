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
import { Store, Loader2, UserCheck } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";
import { GoogleMapsLocationPicker } from "@/components/GoogleMapsLocationPicker";
import { type Shop, type BusinessOwnerLocation } from "@/lib/api";

type AddShopModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopToEdit?: Shop | null;
};

export function AddShopModal({
  open,
  onOpenChange,
  shopToEdit = null,
}: AddShopModalProps) {
  const { addShop, updateShop, shopManagers } = useBusiness();

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [managerId, setManagerId] = useState<string>("");
  const [location, setLocation] = useState<BusinessOwnerLocation>({
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (shopToEdit) {
      setName(shopToEdit.name || "");
      setStatus(shopToEdit.status || "Active");
      setManagerId(shopToEdit.managerId || "");
      setLocation({
        address: shopToEdit.address || shopToEdit.location || "",
        city: shopToEdit.city || "",
        state: shopToEdit.state || "",
        country: shopToEdit.country || "",
        pincode: shopToEdit.pincode || "",
        latitude: shopToEdit.latitude ?? null,
        longitude: shopToEdit.longitude ?? null,
      });
    } else {
      setName("");
      setStatus("Active");
      setManagerId("");
      setLocation({
        address: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
        latitude: null,
        longitude: null,
      });
    }
    setError("");
  }, [shopToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Shop name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload: Partial<Shop> = {
        name: name.trim(),
        location: location.address || [location.city, location.state].filter(Boolean).join(", ") || "Branch Location",
        address: location.address || "",
        city: location.city || "",
        state: location.state || "",
        country: location.country || "",
        pincode: location.pincode || "",
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        status,
        managerId: managerId ? managerId : null,
      };

      if (shopToEdit) {
        await updateShop(shopToEdit.id, payload);
        toast({
          title: "Shop Updated",
          description: `Successfully updated "${name}".`,
        });
      } else {
        await addShop(payload);
        toast({
          title: "Shop Added",
          description: `Successfully created shop "${name}".`,
        });
      }

      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to save shop details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Store className="h-5 w-5 text-primary" />
            {shopToEdit ? "Edit Shop Location" : "Add New Shop Location"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {shopToEdit
              ? "Update shop details, status, assigned Shop Manager, and location coordinates."
              : "Register a new shop location under your business, select map coordinates, and assign a Shop Manager."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          {/* Shop Name & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="shop-name" className="text-xs font-semibold">
                Shop / Branch Name *
              </Label>
              <Input
                id="shop-name"
                placeholder="e.g. Lumina Main Branch, Ahmedabad Branch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shop-status" className="text-xs font-semibold">
                Status
              </Label>
              <select
                id="shop-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Assign Manager Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="shop-manager" className="text-xs font-semibold flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Assigned Shop Manager
            </Label>
            <select
              id="shop-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-primary"
            >
              <option value="">Not Assigned (Unassigned)</option>
              {shopManagers.map((mgr) => (
                <option key={mgr.managerId} value={mgr.managerId}>
                  {mgr.name} ({mgr.email})
                </option>
              ))}
            </select>
          </div>

          {/* Google Maps Location Picker */}
          <GoogleMapsLocationPicker value={location} onChange={setLocation} />

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 text-xs font-bold">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {shopToEdit ? "Save Shop Changes" : "Create Shop Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
