import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type BusinessOwner,
  type BusinessOwnerLocation,
  type ShopManager,
  type Shop,
  fetchBusinessOwners,
  createBusinessOwner as apiCreateBusinessOwner,
  updateBusinessOwner as apiUpdateBusinessOwner,
  deleteBusinessOwner as apiDeleteBusinessOwner,
  fetchShopManagers,
  createShopManager as apiCreateShopManager,
  fetchShops,
  createShop as apiCreateShop,
  updateShop as apiUpdateShop,
  deleteShop as apiDeleteShop,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const SELECTED_OWNER_KEY = "selected_owner_id";

type BusinessContextValue = {
  businessOwners: BusinessOwner[];
  selectedOwnerId: string | null;
  selectedOwner: BusinessOwner | null;
  selectOwner: (id: string) => void;
  refreshOwners: () => Promise<void>;
  addBusinessOwner: (data: {
    name: string;
    email: string;
    password: string;
    businessName?: string;
    industry?: string;
    location?: BusinessOwnerLocation;
  }) => Promise<BusinessOwner>;
  updateBusinessOwner: (
    ownerId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      businessName?: string;
      industry?: string;
      location?: BusinessOwnerLocation;
    }
  ) => Promise<void>;
  deleteBusinessOwner: (ownerId: string) => Promise<void>;
  shopManagers: ShopManager[];
  refreshShopManagers: () => Promise<void>;
  addShopManager: (data: {
    name: string;
    email: string;
    password: string;
    shopId?: string;
    phone?: string;
    ownerId?: string;
  }) => Promise<ShopManager>;
  shops: Shop[];
  refreshShops: () => Promise<void>;
  addShop: (data: Partial<Shop>) => Promise<Shop>;
  updateShop: (shopId: string, data: Partial<Shop>) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  loading: boolean;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(() => {
    return localStorage.getItem(SELECTED_OWNER_KEY);
  });
  const [shopManagers, setShopManagers] = useState<ShopManager[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshOwners = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const owners = await fetchBusinessOwners();
      setBusinessOwners(owners);

      // Auto selection logic for Analysts
      if (user.role === "analyst") {
        const stored = localStorage.getItem(SELECTED_OWNER_KEY);
        const exists = owners.find((o) => o.id === stored);
        if (exists) {
          setSelectedOwnerId(exists.id);
        } else if (owners.length > 0) {
          setSelectedOwnerId(owners[0].id);
          localStorage.setItem(SELECTED_OWNER_KEY, owners[0].id);
        }
      } else if (user.role === "owner") {
        setSelectedOwnerId(user.id);
        localStorage.setItem(SELECTED_OWNER_KEY, user.id);
      }
    } catch (err) {
      console.error("Failed to fetch business owners:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshShopManagers = useCallback(async () => {
    if (!user) return;
    try {
      const mgrs = await fetchShopManagers();
      setShopManagers(mgrs);
    } catch (err) {
      console.error("Failed to fetch shop managers:", err);
    }
  }, [user]);

  const refreshShops = useCallback(async () => {
    if (!user) return;
    try {
      const sList = await fetchShops();
      setShops(sList);
    } catch (err) {
      console.error("Failed to fetch shops:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshOwners();
      refreshShopManagers();
      refreshShops();
    }
  }, [user, refreshOwners, refreshShopManagers, refreshShops]);

  const selectOwner = (id: string) => {
    setSelectedOwnerId(id);
    localStorage.setItem(SELECTED_OWNER_KEY, id);
    // Invalidate all react-query caches so dashboard widgets refetch for newly selected owner
    queryClient.invalidateQueries();
  };

  const addBusinessOwner = async (data: {
    name: string;
    email: string;
    password: string;
    businessName?: string;
    industry?: string;
    location?: BusinessOwnerLocation;
  }) => {
    const created = await apiCreateBusinessOwner(data);
    await refreshOwners();
    selectOwner(created.id);
    return created;
  };

  const updateBusinessOwner = async (
    ownerId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      businessName?: string;
      industry?: string;
      location?: BusinessOwnerLocation;
    }
  ) => {
    await apiUpdateBusinessOwner(ownerId, data);
    await refreshOwners();
  };

  const deleteBusinessOwner = async (ownerId: string) => {
    await apiDeleteBusinessOwner(ownerId);
    await refreshOwners();
  };

  const addShopManager = async (data: {
    name: string;
    email: string;
    password: string;
    shopId?: string;
    phone?: string;
    ownerId?: string;
  }) => {
    const created = await apiCreateShopManager(data);
    await refreshShopManagers();
    await refreshOwners();
    return created;
  };

  const addShop = async (data: Partial<Shop>) => {
    const created = await apiCreateShop(data as any);
    await refreshShops();
    await refreshOwners();
    return created;
  };

  const updateShop = async (shopId: string, data: Partial<Shop>) => {
    await apiUpdateShop(shopId, data as any);
    await refreshShops();
    await refreshOwners();
    await refreshShopManagers();
  };

  const deleteShop = async (shopId: string) => {
    await apiDeleteShop(shopId);
    await refreshShops();
    await refreshOwners();
    await refreshShopManagers();
  };

  const selectedOwner =
    businessOwners.find((o) => o.id === selectedOwnerId) ||
    (businessOwners.length > 0 ? businessOwners[0] : null);

  return (
    <BusinessContext.Provider
      value={{
        businessOwners,
        selectedOwnerId,
        selectedOwner,
        selectOwner,
        refreshOwners,
        addBusinessOwner,
        updateBusinessOwner,
        deleteBusinessOwner,
        shopManagers,
        refreshShopManagers,
        addShopManager,
        shops,
        refreshShops,
        addShop,
        updateShop,
        deleteShop,
        loading,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within a BusinessProvider");
  return ctx;
}
