/**
 * REST API client — replaces Supabase SDK.
 * All data operations go through the Python Flask backend.
 */

// When VITE_API_URL is set, use it directly (e.g. production).
// When unset, use "" so requests like "/api/auth/login" go through the
// Vite dev proxy configured in vite.config.ts.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ── Auth token ────────────────────────────────────────────────────────────--
// The login flow stores a signed token here; apiFetch attaches it so the
// backend can resolve the current user.

const TOKEN_KEY = "auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// ── Helper ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const selectedOwnerId = localStorage.getItem("selected_owner_id");
  const selectedShopId = localStorage.getItem("selected_shop_id");
  const url = API_BASE ? `${API_BASE}${path}` : path;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(selectedOwnerId ? { "X-Business-Owner-Id": selectedOwnerId } : {}),
        ...(selectedShopId ? { "X-Shop-Id": selectedShopId } : {}),
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed with status ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
      // If fetching relative URL or API_BASE fails, try direct localhost:5000 fallback
      if (API_BASE === "") {
        const directUrl = `http://localhost:5000${path}`;
        const res = await fetch(directUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options?.headers || {}),
          },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errData.error || `Request failed with status ${res.status}`);
        }
        return res.json();
      }
    }
    throw err;
  }
}

// ── Transactions ────────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  created_at?: string;
};

export async function fetchTransactions(): Promise<Transaction[]> {
  return apiFetch<Transaction[]>("/api/transactions");
}

export async function createTransaction(data: {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
}

// ── Products ────────────────────────────────────────────────────────────────

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  units_sold: number;
  revenue: number;
  trend: string;
  cluster: string;
  created_at?: string;
};

export async function fetchProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/api/products");
}

export async function createProduct(data: {
  name: string;
  category: string;
  price: number;
  units_sold?: number;
  revenue?: number;
  trend?: string;
  cluster?: string;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<void> {
  await apiFetch(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Chat ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatSession = {
  session_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string | null;
};

export async function fetchChatHistory(
  sessionId = "default"
): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(
    `/api/chat/history?session_id=${encodeURIComponent(sessionId)}`
  );
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  return apiFetch<ChatSession[]>("/api/chat/sessions");
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await apiFetch(`/api/chat/session/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function saveChatMessage(
  role: string,
  content: string,
  sessionId = "default"
): Promise<void> {
  await apiFetch("/api/chat/save", {
    method: "POST",
    body: JSON.stringify({ role, content, session_id: sessionId }),
  });
}

/**
 * Returns the full URL for streaming chat (used with fetch + ReadableStream).
 */
export function getChatStreamUrl(): string {
  return `${API_BASE}/api/chat`;
}

// ── Pricing (AI suggestions + Analyst approval workflow) ────────────────────

export type PricingRecommendation = {
  id: string;
  productId: string;
  product: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  confidence: number;
  expectedImpact: string;
  modelUsed?: string;
  status: "pending" | "approved" | "rejected" | "applied";
  createdAt?: string;
  reviewedAt?: string | null;
};

export async function generatePricing(): Promise<{
  suggestions: PricingRecommendation[];
  model_used: string;
}> {
  return apiFetch("/api/pricing/generate", { method: "POST" });
}

export async function fetchPricing(
  status?: string
): Promise<PricingRecommendation[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<PricingRecommendation[]>(`/api/pricing${q}`);
}

export async function approvePricing(id: string): Promise<void> {
  await apiFetch(`/api/pricing/${id}/approve`, { method: "POST" });
}

export async function rejectPricing(id: string): Promise<void> {
  await apiFetch(`/api/pricing/${id}/reject`, { method: "POST" });
}

// ── Tutorials ───────────────────────────────────────────────────────────────

export type Tutorial = {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  targetRole: "owner" | "manager" | "both";
  /** Optional per-language YouTube IDs; youtubeId is the default/fallback. */
  videoIds?: Record<string, string>;
  addedAt?: string;
};

export async function fetchTutorials(
  role?: "owner" | "manager"
): Promise<Tutorial[]> {
  const q = role ? `?role=${role}` : "";
  return apiFetch<Tutorial[]>(`/api/tutorials${q}`);
}

export async function createTutorial(data: {
  title: string;
  description?: string;
  youtubeId: string;
  targetRole: "owner" | "manager" | "both";
  videoIds?: Record<string, string>;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/api/tutorials", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTutorial(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    youtubeId: string;
    targetRole: "owner" | "manager" | "both";
    videoIds: Record<string, string>;
  }>
): Promise<void> {
  await apiFetch(`/api/tutorials/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTutorial(id: string): Promise<void> {
  await apiFetch(`/api/tutorials/${id}`, { method: "DELETE" });
}

// ── Page Visibility (Analyst controls per-role page access) ──────────────────

export type PageVisibility = {
  pageUrl: string;
  role: "owner" | "manager";
  visible: boolean;
};

export async function fetchVisibility(
  role?: "owner" | "manager"
): Promise<PageVisibility[]> {
  const q = role ? `?role=${role}` : "";
  return apiFetch<PageVisibility[]>(`/api/visibility${q}`);
}

export async function setVisibility(
  pageUrl: string,
  role: "owner" | "manager",
  visible: boolean
): Promise<void> {
  await apiFetch("/api/visibility", {
    method: "PUT",
    body: JSON.stringify({ pageUrl, role, visible }),
  });
}

// ── Auth (login / register / current user) ───────────────────────────────────

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "analyst";
  avatarUrl?: string | null;
};

export type AuthResponse = { token: string; user: AuthUser };

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Authenticates against the real MySQL database via Flask backend.
  // POST /api/auth/login → { token, user }
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  role: "owner" | "manager" | "analyst";
}): Promise<AuthResponse> {
  // Inserts a new user into MySQL (password is bcrypt-hashed server-side).
  // POST /api/auth/register → { token, user }
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function googleAuthUser(data: {
  email?: string;
  name?: string;
  role?: "owner" | "manager" | "analyst";
  avatarUrl?: string;
  credential?: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; resetCode?: string }> {
  return apiFetch<{ success: boolean; message: string; resetCode?: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(data: {
  email: string;
  resetCode: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  // Validates the stored token against MySQL and returns the real user record.
  // GET /api/auth/me — requires Authorization: Bearer <token>
  const res = await apiFetch<{ user: AuthUser }>("/api/auth/me");
  return res.user;
}

export async function updateProfile(data: {
  name?: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.user;
}

// ── Business Owners & Shop Managers ─────────────────────────────────────────

export type BusinessOwnerLocation = {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type BusinessOwner = {
  id: string;
  name: string;
  email: string;
  role: "owner";
  avatarUrl?: string | null;
  createdAt: string;
  businessId?: string;
  businessName: string;
  industry: string;
  shopsCount: number;
  managersCount: number;
  location?: BusinessOwnerLocation | null;
};

export type ShopManager = {
  id: string;
  managerId: string;
  name: string;
  email: string;
  phone?: string;
  shopId?: string;
  shopName?: string;
  createdAt?: string;
};

export type Shop = {
  id: string;
  businessId?: string;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  managerId?: string | null;
  managerName?: string | null;
  createdAt?: string;
};

export async function fetchBusinessOwners(): Promise<BusinessOwner[]> {
  return apiFetch<BusinessOwner[]>("/api/business-owners");
}

export async function createBusinessOwner(data: {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  industry?: string;
  location?: BusinessOwnerLocation;
}): Promise<BusinessOwner> {
  return apiFetch<BusinessOwner>("/api/business-owners", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBusinessOwner(
  ownerId: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    businessName?: string;
    industry?: string;
    location?: BusinessOwnerLocation;
  }
): Promise<{ success: boolean; id: string }> {
  return apiFetch<{ success: boolean; id: string }>(`/api/business-owners/${ownerId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteBusinessOwner(ownerId: string): Promise<void> {
  await apiFetch(`/api/business-owners/${ownerId}`, {
    method: "DELETE",
  });
}

export async function createBusiness(data: {
  name: string;
  industry?: string;
  location?: BusinessOwnerLocation;
}): Promise<{ id: string; name: string; industry: string }> {
  return apiFetch<{ id: string; name: string; industry: string }>("/api/businesses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBusiness(
  businessId: string,
  data: {
    name?: string;
    industry?: string;
    location?: BusinessOwnerLocation;
  }
): Promise<void> {
  await apiFetch(`/api/businesses/${businessId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteBusiness(businessId: string): Promise<void> {
  await apiFetch(`/api/businesses/${businessId}`, {
    method: "DELETE",
  });
}

export async function fetchBusinessOwnerDetails(ownerId: string): Promise<{
  owner: AuthUser;
  business: { id: string; name: string; industry: string };
  shops: Shop[];
  shopManagers: ShopManager[];
  metrics: { totalRevenue: number; totalExpenses: number; netProfit: number };
}> {
  return apiFetch(`/api/business-owners/${ownerId}`);
}

export async function fetchShopManagers(): Promise<ShopManager[]> {
  return apiFetch<ShopManager[]>("/api/shop-managers");
}

export async function createShopManager(data: {
  name: string;
  email: string;
  password: string;
  shopId?: string;
  phone?: string;
  ownerId?: string;
}): Promise<ShopManager> {
  return apiFetch<ShopManager>("/api/shop-managers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchShops(): Promise<Shop[]> {
  return apiFetch<Shop[]>("/api/shops");
}

export async function createShop(data: {
  name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  managerId?: string | null;
}): Promise<Shop> {
  return apiFetch<Shop>("/api/shops", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateShop(
  shopId: string,
  data: {
    name?: string;
    location?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number | null;
    longitude?: number | null;
    status?: string;
    managerId?: string | null;
  }
): Promise<void> {
  await apiFetch(`/api/shops/${shopId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteShop(shopId: string): Promise<void> {
  await apiFetch(`/api/shops/${shopId}`, {
    method: "DELETE",
  });
}

// ── Shop Manager Permissions & Profile Operations ────────────────────────────

export type ManagerPermissionsMap = Record<string, boolean>;

export async function fetchShopManagerPermissions(
  managerId: string
): Promise<{ managerId: string; permissions: ManagerPermissionsMap }> {
  return apiFetch<{ managerId: string; permissions: ManagerPermissionsMap }>(
    `/api/shop-managers/${managerId}/permissions`
  );
}

export async function updateShopManagerPermissions(
  managerId: string,
  permissions: ManagerPermissionsMap
): Promise<void> {
  await apiFetch(`/api/shop-managers/${managerId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}

export async function resetShopManagerPermissions(
  managerId: string
): Promise<{ permissions: ManagerPermissionsMap }> {
  return apiFetch<{ permissions: ManagerPermissionsMap }>(
    `/api/shop-managers/${managerId}/permissions/reset`,
    { method: "POST" }
  );
}

export async function updateShopManagerProfile(
  managerId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    shopId?: string;
    password?: string;
  }
): Promise<void> {
  await apiFetch(`/api/shop-managers/${managerId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteShopManager(managerId: string): Promise<void> {
  await apiFetch(`/api/shop-managers/${managerId}`, { method: "DELETE" });
}

export async function fetchMyPermissions(): Promise<ManagerPermissionsMap> {
  const res = await apiFetch<{ permissions: ManagerPermissionsMap }>(
    "/api/my-permissions"
  );
  return res.permissions;
}

export type ShopPerformance = {
  shop: {
    id: string;
    name: string;
    location: string;
    city: string;
    status: string;
    managerName?: string;
  };
  performance: {
    totalSales: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalCustomers: number;
    avgOrderValue: number;
    salesGrowth: number;
    revenueTrend: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
    categoryBreakdown: Array<{ name: string; value: number; percentage: number }>;
    recentTransactions: Array<{ id: string; date: string; description: string; category: string; amount: number; type: string }>;
  };
};

export async function fetchShopPerformance(shopId: string): Promise<ShopPerformance> {
  return apiFetch<ShopPerformance>(`/api/shops/${shopId}/performance`);
}

// ── Re-export base for direct fetch usage ───────────────────────────────────
export { API_BASE };


