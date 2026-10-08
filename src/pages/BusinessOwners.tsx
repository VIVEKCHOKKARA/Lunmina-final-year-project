import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  Briefcase,
  Store,
  Users,
  Plus,
  Search,
  CheckCircle2,
  Building,
  Mail,
  ChevronRight,
  Eye,
  Edit,
  ShieldCheck,
  Trash2,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddBusinessOwnerModal } from "@/components/AddBusinessOwnerModal";
import { AddShopModal } from "@/components/AddShopModal";
import { AddShopManagerModal } from "@/components/AddShopManagerModal";
import { ViewShopManagerModal } from "@/components/ViewShopManagerModal";
import { EditShopManagerModal } from "@/components/EditShopManagerModal";
import { ManagePermissionsModal } from "@/components/ManagePermissionsModal";
import { ShopPerformanceDisplay } from "@/components/ShopPerformanceDisplay";
import { type ShopManager, type BusinessOwner, type Shop, deleteShopManager } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function BusinessOwners() {
  const { user } = useAuth();
  const {
    businessOwners,
    selectedOwnerId,
    selectOwner,
    deleteBusinessOwner,
    shopManagers,
    shops,
    refreshShopManagers,
    deleteShop,
  } = useBusiness();

  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Owner Modal states
  const [addOwnerModalOpen, setAddOwnerModalOpen] = useState(false);
  const [ownerToEdit, setOwnerToEdit] = useState<BusinessOwner | null>(null);

  // Shop Selection & Modal states
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [addShopModalOpen, setAddShopModalOpen] = useState(false);
  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);

  // Manager Modal states
  const [addManagerModalOpen, setAddManagerModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ShopManager | null>(null);
  const [viewManagerOpen, setViewManagerOpen] = useState(false);
  const [editManagerOpen, setEditManagerOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  const isAnalyst = user?.role === "analyst";
  const isOwner = user?.role === "owner";
  const isManager = user?.role === "manager";

  // Auto-select first shop if available and no shop selected
  useEffect(() => {
    if (shops && shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

  const filteredOwners = businessOwners.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.businessName.toLowerCase().includes(q) ||
      o.industry.toLowerCase().includes(q)
    );
  });

  const handleAddOwner = () => {
    setOwnerToEdit(null);
    setAddOwnerModalOpen(true);
  };

  const handleEditOwner = (owner: BusinessOwner) => {
    setOwnerToEdit(owner);
    setAddOwnerModalOpen(true);
  };

  const handleDeleteOwner = async (owner: BusinessOwner) => {
    if (!window.confirm(`Delete Business Owner "${owner.name}" (${owner.businessName})? This action cannot be undone.`)) return;
    try {
      await deleteBusinessOwner(owner.id);
      toast({
        title: "Business Owner Deleted",
        description: `Successfully removed ${owner.name}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete Business Owner.",
        variant: "destructive",
      });
    }
  };

  // Shop actions
  const handleAddShop = () => {
    setShopToEdit(null);
    setAddShopModalOpen(true);
  };

  const handleEditShop = (shop: Shop) => {
    setShopToEdit(shop);
    setAddShopModalOpen(true);
  };

  const handleDeleteShop = async (shop: Shop) => {
    const warning = shop.managerName
      ? `Warning: This shop has an assigned Shop Manager (${shop.managerName}). Deleting this shop will unassign the manager.\n\n`
      : "";
    if (!window.confirm(`${warning}Are you sure you want to delete shop "${shop.name}"?`)) return;

    try {
      await deleteShop(shop.id);
      toast({
        title: "Shop Deleted",
        description: `Successfully removed shop "${shop.name}".`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete shop.",
        variant: "destructive",
      });
    }
  };

  // Manager actions
  const handleOpenView = (mgr: ShopManager) => {
    setSelectedManager(mgr);
    setViewManagerOpen(true);
  };

  const handleOpenEdit = (mgr: ShopManager) => {
    setSelectedManager(mgr);
    setEditManagerOpen(true);
  };

  const handleOpenAccess = (mgr: ShopManager) => {
    setSelectedManager(mgr);
    setPermissionsModalOpen(true);
  };

  const handleRemove = async (mgr: ShopManager) => {
    if (!window.confirm(`Remove Shop Manager ${mgr.name}? Account access will be revoked immediately.`)) return;
    try {
      await deleteShopManager(mgr.managerId);
      toast({
        title: "Manager Removed",
        description: `Successfully removed ${mgr.name}.`,
      });
      await refreshShopManagers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to remove manager.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isAnalyst ? "Business Owners Directory" : "My Shops & Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAnalyst
              ? "Manage Business Owner profiles, analyze individual businesses, and create new owners."
              : "Manage your shop locations, assign Shop Managers, and configure per-manager access permissions."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAnalyst && (
            <Button
              onClick={handleAddOwner}
              className="gap-2 font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Business Owner
            </Button>
          )}

          {isOwner && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddShop}
                variant="outline"
                className="gap-2 font-bold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Shop
              </Button>

              <Button
                onClick={() => setAddManagerModalOpen(true)}
                className="gap-2 font-bold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Shop Manager
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Analyst View: Business Owners Grid & Selection ── */}
      {isAnalyst && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by owner name, email, or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>

          {/* Grid of Business Owners */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOwners.map((owner) => {
              const isSelected = owner.id === selectedOwnerId;
              const hasLocation = Boolean(
                owner.location &&
                  (owner.location.address || owner.location.city || owner.location.latitude !== null)
              );

              return (
                <div
                  key={owner.id}
                  className={`bg-card text-card-foreground rounded-xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "border-primary ring-1 ring-primary/40 shadow-md"
                      : "border-border hover:border-border/80 hover:shadow-sm"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <Building className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">
                            {owner.businessName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {owner.industry}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      )}
                    </div>

                    {/* Owner Details */}
                    <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> Owner:
                        </span>
                        <span className="font-semibold text-foreground">{owner.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" /> Email:
                        </span>
                        <span className="font-mono text-foreground truncate max-w-[180px]">
                          {owner.email}
                        </span>
                      </div>
                    </div>

                    {/* Saved Google Maps Location Badge */}
                    {hasLocation && owner.location ? (
                      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">
                            {owner.location.address ||
                              [owner.location.city, owner.location.country].filter(Boolean).join(", ")}
                          </span>
                        </div>
                        {owner.location.latitude !== null && owner.location.longitude !== null && (
                          <p className="text-[10px] font-mono text-muted-foreground pl-5">
                            Lat: {owner.location.latitude?.toFixed(4)}, Lng: {owner.location.longitude?.toFixed(4)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-accent/30 border border-border/30 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 opacity-50 shrink-0" />
                        <span>No location saved yet</span>
                      </div>
                    )}

                    {/* Counts */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-lg bg-accent/40 border border-border/40">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Shops</p>
                        <p className="text-lg font-bold text-foreground">{owner.shopsCount}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-accent/40 border border-border/40">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Managers</p>
                        <p className="text-lg font-bold text-foreground">{owner.managersCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      variant={isSelected ? "secondary" : "default"}
                      size="sm"
                      onClick={() => {
                        selectOwner(owner.id);
                        navigate("/");
                      }}
                      className="flex-1 gap-1.5 text-xs font-bold"
                    >
                      {isSelected ? "Analyzed Currently" : "Select for Analysis"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOwner(owner)}
                      className="h-8 gap-1 px-2.5 text-xs font-semibold"
                      title="Edit Owner & Location"
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOwner(owner)}
                      className="h-8 gap-1 px-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      title="Delete Owner"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOwners.length === 0 && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No Business Owners found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching for a different name or add a new Business Owner account.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Business Owner View: Multi-Shop & Shop Managers Management ── */}
      {isOwner && (
        <div className="space-y-6">
          {/* Top Section: Live Selected Shop Performance Display */}
          <ShopPerformanceDisplay
            selectedShopId={selectedShopId}
            shops={shops}
            onSelectShop={setSelectedShopId}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column: Shops List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Store Locations ({shops.length})
                </h2>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddShop}
                  className="gap-1 text-xs font-bold shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Shop
                </Button>
              </div>

              <div className="space-y-3">
                {shops.map((shop) => {
                  const isSelected = shop.id === selectedShopId;
                  return (
                    <div
                      key={shop.id}
                      className={`bg-card text-card-foreground p-4 rounded-xl border transition-all duration-200 space-y-3 shadow-xs ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-foreground">{shop.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              {shop.status || "Active"}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                                Active Performance
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span>{shop.address || shop.location || "Branch Location"}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Manager</p>
                          <p className="text-xs font-semibold text-primary">
                            {shop.managerName || "Not Assigned"}
                          </p>
                        </div>
                      </div>

                      {/* Actions: View Performance, Edit & Delete */}
                      <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant={isSelected ? "secondary" : "default"}
                          onClick={() => setSelectedShopId(shop.id)}
                          className="h-7 gap-1 px-3 text-xs font-bold"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                          {isSelected ? "Currently Viewing" : "View Performance"}
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditShop(shop)}
                            className="h-7 gap-1 px-2.5 text-xs font-semibold"
                          >
                            <Edit className="h-3 w-3 text-muted-foreground" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteShop(shop)}
                            className="h-7 gap-1 px-2 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {shops.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border space-y-2">
                    <Store className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-1" />
                    <p className="font-semibold text-sm text-foreground">No store locations created yet</p>
                    <p>Click "+ Add Shop" to create shop locations for your business.</p>
                  </div>
                )}
              </div>
            </div>

          {/* Right Column: Shop Managers List & Actions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-secondary" />
                Shop Managers ({shopManagers.length})
              </h2>

              <Button
                size="sm"
                onClick={() => setAddManagerModalOpen(true)}
                className="gap-1.5 text-xs font-bold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Shop Manager
              </Button>
            </div>

            <div className="space-y-3">
              {shopManagers.map((mgr) => (
                <div
                  key={mgr.id}
                  className="bg-card text-card-foreground p-4 rounded-xl border border-border space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-foreground">{mgr.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
                          Shop Manager
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">📧 {mgr.email} {mgr.phone ? `• 📞 ${mgr.phone}` : ""}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Location</p>
                      <p className="text-xs font-semibold text-primary">{mgr.shopName || "Not Assigned"}</p>
                    </div>
                  </div>

                  {/* Manager Action Toolbar */}
                  <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenView(mgr)}
                        className="h-8 gap-1 px-2.5 text-xs font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        View
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(mgr)}
                        className="h-8 gap-1 px-2.5 text-xs font-semibold"
                      >
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenAccess(mgr)}
                        className="h-8 gap-1.5 px-3 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Manage Access
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(mgr)}
                      className="h-8 gap-1 px-2 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {shopManagers.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border space-y-2">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-1" />
                  <p className="font-semibold text-sm text-foreground">No Shop Managers assigned yet</p>
                  <p>Click "+ Add Shop Manager" to register and configure individual page access for your staff.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Shop Manager View: Assigned Shop & Live Performance ── */}
      {isManager && (
        <div className="space-y-6">
          {shops.length > 0 ? (
            <ShopPerformanceDisplay
              selectedShopId={selectedShopId || shops[0].id}
              shops={shops}
              onSelectShop={() => {}}
            />
          ) : (
            <div className="bg-card text-card-foreground p-12 rounded-2xl border border-border text-center space-y-3 shadow-xs">
              <Store className="h-10 w-10 text-muted-foreground mx-auto opacity-50 mb-1" />
              <h3 className="font-bold text-lg text-foreground">No shop assigned to your account</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You do not currently have a shop assigned. Please contact your Business Owner to be assigned to a store location.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddBusinessOwnerModal
        open={addOwnerModalOpen}
        onOpenChange={setAddOwnerModalOpen}
        ownerToEdit={ownerToEdit}
      />

      <AddShopModal
        open={addShopModalOpen}
        onOpenChange={setAddShopModalOpen}
        shopToEdit={shopToEdit}
      />

      <AddShopManagerModal open={addManagerModalOpen} onOpenChange={setAddManagerModalOpen} />

      <ViewShopManagerModal
        open={viewManagerOpen}
        onOpenChange={setViewManagerOpen}
        manager={selectedManager}
        onEdit={(m) => {
          setSelectedManager(m);
          setEditManagerOpen(true);
        }}
        onManageAccess={(m) => {
          setSelectedManager(m);
          setPermissionsModalOpen(true);
        }}
        onDeleted={refreshShopManagers}
      />

      <EditShopManagerModal
        open={editManagerOpen}
        onOpenChange={setEditManagerOpen}
        manager={selectedManager}
        onUpdated={refreshShopManagers}
      />

      <ManagePermissionsModal
        open={permissionsModalOpen}
        onOpenChange={setPermissionsModalOpen}
        manager={selectedManager}
        onPermissionsUpdated={refreshShopManagers}
      />
    </div>
  );
}
