import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Briefcase, Store, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddBusinessOwnerModal } from "@/components/AddBusinessOwnerModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OwnerSelector() {
  const { user } = useAuth();
  const { businessOwners, selectedOwnerId, selectedOwner, selectOwner, shops } = useBusiness();
  const [addModalOpen, setAddModalOpen] = useState(false);

  if (!user) return null;

  // Non-analyst roles: display current business badge (or assigned store for Shop Manager)
  if (user.role !== "analyst") {
    const assignedShop = user.role === "manager" ? (shops.find((s) => s.managerId === user.id) || shops[0]) : null;
    const displayName = user.role === "manager"
      ? (assignedShop ? assignedShop.name : "Assigned Shop")
      : (selectedOwner?.businessName || `${user.name}'s Business`);
    const Icon = user.role === "manager" ? Store : Briefcase;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/40 border border-border/60 text-xs font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="truncate max-w-[200px]">
          {displayName}
        </span>
      </div>
    );
  }

  // Financial Analyst role: Interactive Business Owner Selector
  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 px-3 bg-card text-foreground border-border hover:bg-accent hover:text-foreground shadow-sm"
            >
              <Briefcase className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium max-w-[180px] truncate">
                {selectedOwner ? (
                  <>
                    <span className="font-semibold">{selectedOwner.businessName}</span>
                    <span className="text-muted-foreground ml-1">({selectedOwner.name})</span>
                  </>
                ) : (
                  "Select Business Owner..."
                )}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 bg-card text-card-foreground border-border">
            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Business Owner
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {businessOwners.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No Business Owners found.
              </div>
            ) : (
              businessOwners.map((owner) => {
                const isSelected = owner.id === selectedOwnerId;
                return (
                  <DropdownMenuItem
                    key={owner.id}
                    onClick={() => selectOwner(owner.id)}
                    className="flex items-center justify-between cursor-pointer py-2"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-foreground truncate">
                        {owner.businessName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {owner.name} • {owner.industry}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setAddModalOpen(true)}
              className="cursor-pointer text-primary font-medium flex items-center gap-2 py-2"
            >
              <Plus className="h-4 w-4" />
              Add New Business Owner
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => setAddModalOpen(true)}
          className="h-9 gap-1.5 px-3 text-xs font-bold hidden sm:flex"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Owner
        </Button>
      </div>

      <AddBusinessOwnerModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </>
  );
}
