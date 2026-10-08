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
import { Briefcase, Loader2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";
import { GoogleMapsLocationPicker } from "@/components/GoogleMapsLocationPicker";
import { type BusinessOwner, type BusinessOwnerLocation } from "@/lib/api";

type AddBusinessOwnerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerToEdit?: BusinessOwner | null;
};

export function AddBusinessOwnerModal({
  open,
  onOpenChange,
  ownerToEdit = null,
}: AddBusinessOwnerModalProps) {
  const { addBusinessOwner, updateBusinessOwner } = useBusiness();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
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

  // Sync state when editing an existing owner or opening modal
  useEffect(() => {
    if (open) {
      setError("");
      if (ownerToEdit) {
        setName(ownerToEdit.name || "");
        setEmail(ownerToEdit.email || "");
        setPassword(""); // Optional when editing
        setBusinessName(ownerToEdit.businessName || "");
        setIndustry(ownerToEdit.industry || "");
        setLocation(
          ownerToEdit.location || {
            address: "",
            city: "",
            state: "",
            country: "",
            pincode: "",
            latitude: null,
            longitude: null,
          }
        );
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setBusinessName("");
        setIndustry("");
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
    }
  }, [open, ownerToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!ownerToEdit && !password) {
      setError("Password is required for new accounts.");
      return;
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      if (ownerToEdit) {
        await updateBusinessOwner(ownerToEdit.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password || undefined,
          businessName: businessName.trim() || `${name}'s Enterprise`,
          industry: industry.trim() || "Retail & Operations",
          location,
        });

        toast({
          title: "Business Owner Updated",
          description: `Successfully updated ${name}'s profile and Google Maps location.`,
        });
      } else {
        const created = await addBusinessOwner({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          businessName: businessName.trim() || `${name}'s Enterprise`,
          industry: industry.trim() || "Retail & Operations",
          location,
        });

        toast({
          title: "Business Owner Created",
          description: `Successfully added ${created.name} (${created.businessName}) with Google Maps location.`,
        });
      }

      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to save Business Owner record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {ownerToEdit ? "Edit Business Owner & Location" : "Add New Business Owner"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {ownerToEdit
              ? "Update Business Owner account details and adjust their Google Maps location pin."
              : "Register a new Business Owner account, assign location coordinates via Google Maps, and initialize their profile."}
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
              <Label htmlFor="owner-name">Owner Full Name *</Label>
              <Input
                id="owner-name"
                placeholder="e.g. Raj Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-email">Email Address *</Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="e.g. raj@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-password">
              {ownerToEdit ? "Account Password (Leave blank to keep unchanged)" : "Account Password *"}
            </Label>
            <Input
              id="owner-password"
              type="password"
              placeholder={ownerToEdit ? "••••••••" : "Minimum 6 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!ownerToEdit}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Business / Store Name</Label>
              <Input
                id="biz-name"
                placeholder="e.g. Raj Retail & Apparel"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-industry">Industry / Sector</Label>
              <Input
                id="biz-industry"
                placeholder="e.g. Apparel, Supermarket"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
          </div>

          {/* ── Google Maps Location Picker Section ── */}
          <GoogleMapsLocationPicker value={location} onChange={setLocation} />

          <DialogFooter className="pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 font-bold">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {ownerToEdit ? "Save Location & Profile" : "Create Business Owner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
