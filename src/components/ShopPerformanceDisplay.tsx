import { useState, useEffect } from "react";
import {
  Store,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Users,
  CreditCard,
  Loader2,
  MapPin,
  User,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { type Shop, type ShopPerformance, fetchShopPerformance } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CHART_COLORS = {
  teal: "hsl(172, 66%, 50%)",
  green: "hsl(142, 69%, 58%)",
  rose: "hsl(351, 89%, 70%)",
  slate: "hsl(217, 33%, 35%)",
};

const PIE_COLORS = [CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.rose, CHART_COLORS.slate];

type ShopPerformanceDisplayProps = {
  selectedShopId: string | null;
  shops: Shop[];
  onSelectShop: (shopId: string | null) => void;
};

const fmtCurrency = (val: number | undefined | null) => `₹${(val ?? 0).toLocaleString("en-IN")}`;
const fmtNumber = (val: number | undefined | null) => (val ?? 0).toLocaleString("en-IN");

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl bg-card border border-border p-3 shadow-lg text-xs space-y-1">
      <p className="text-muted-foreground font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-medium" style={{ color: p.color }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}:
          </span>
          <span className="font-bold text-foreground">
            {fmtCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function ShopPerformanceDisplay({
  selectedShopId,
  shops = [],
  onSelectShop,
}: ShopPerformanceDisplayProps) {
  const { user } = useAuth();
  const [data, setData] = useState<ShopPerformance | null>(null);
  const [loading, setLoading] = useState(false);

  const isOwnerOrAnalyst = user?.role === "owner" || user?.role === "analyst";

  // Default to the first store if no store is selected
  const defaultShopId = (shops && shops.length > 0) ? shops[0].id : (isOwnerOrAnalyst ? "all" : "");
  const activeShopId = selectedShopId || defaultShopId;

  useEffect(() => {
    if (!selectedShopId && shops && shops.length > 0) {
      onSelectShop(shops[0].id);
    }
  }, [shops, selectedShopId, onSelectShop]);

  useEffect(() => {
    if (!activeShopId) return;
    let isMounted = true;
    setLoading(true);

    fetchShopPerformance(activeShopId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err: any) => {
        if (isMounted) {
          toast({
            title: "Performance Load Error",
            description: err?.message || "Failed to load shop performance data.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeShopId]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3 shadow-xs">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          Fetching shop performance & sales metrics...
        </p>
      </div>
    );
  }

  const perf = data?.performance || {
    totalSales: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    salesGrowth: 0,
    revenueTrend: [],
    categoryBreakdown: [],
    recentTransactions: [],
  };

  const currentShop = data?.shop || {
    id: selectedShopId,
    name: "Selected Shop",
    location: "Branch Location",
    city: "",
    status: "Active",
    managerName: "Unassigned",
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Shop Selector */}
      <div className="bg-card rounded-2xl border border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-foreground">
                {currentShop.name}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {currentShop.status || "Active Branch"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                {currentShop.location || "Branch Location"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-primary" />
                Manager: <strong className="text-foreground">{currentShop.managerName || "Unassigned"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Dropdown Shop Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
            Active Shop:
          </span>
          <Select value={activeShopId} onValueChange={(val) => onSelectShop(val)}>
            <SelectTrigger className="w-[230px] bg-background border-border font-bold text-xs">
              <SelectValue placeholder="Select Shop Location" />
            </SelectTrigger>
            <SelectContent>
              {isOwnerOrAnalyst && (
                <SelectItem value="all" className="text-xs font-bold text-primary">
                  🏢 All Shops Combined
                </SelectItem>
              )}
              {shops.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isOwnerOrAnalyst && selectedShopId !== "all" && selectedShopId !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectShop("all")}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="Show All Shops Net Profit"
            >
              All Shops
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Sales"
          value={fmtCurrency(perf.totalSales)}
          change={`+${perf.salesGrowth ?? 0}% vs last period`}
          changeType="positive"
          icon={DollarSign}
        />
        <MetricCard
          label="Net Profit"
          value={fmtCurrency(perf.netProfit)}
          change={`+${((perf.salesGrowth ?? 0) * 0.85).toFixed(1)}% net margin`}
          changeType="positive"
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          label="Total Expenses"
          value={fmtCurrency(perf.totalExpenses)}
          change="Operational costs"
          changeType="negative"
          icon={TrendingDown}
          variant="alert"
        />
        <MetricCard
          label="Total Orders"
          value={fmtNumber(perf.totalOrders)}
          change={`${fmtNumber(perf.completedOrders)} Completed • ${fmtNumber(perf.pendingOrders)} Pending`}
          changeType="positive"
          icon={ShoppingCart}
        />

        <MetricCard
          label="Completed Orders"
          value={fmtNumber(perf.completedOrders)}
          change="Processed successfully"
          changeType="positive"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          label="Pending Orders"
          value={fmtNumber(perf.pendingOrders)}
          change="In fulfillment pipeline"
          changeType="neutral"
          icon={Clock}
        />
        <MetricCard
          label="Total Customers"
          value={fmtNumber(perf.totalCustomers)}
          change="Unique buyers"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          label="Avg Order Value (AOV)"
          value={fmtCurrency(perf.avgOrderValue)}
          change="Per transaction average"
          changeType="positive"
          icon={CreditCard}
        />
      </div>

      {/* Recharts Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue & Profit Area Chart */}
        <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border lg:col-span-2 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Monthly Revenue & Profit Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Financial performance for {currentShop.name}
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent border border-border text-muted-foreground">
              Last 6 Months
            </span>
          </div>

          {perf.revenueTrend && perf.revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={perf.revenueTrend}>
                <defs>
                  <linearGradient id="shopTealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="shopGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={CHART_COLORS.teal}
                  strokeWidth={2.5}
                  fill="url(#shopTealGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke={CHART_COLORS.green}
                  strokeWidth={2.5}
                  fill="url(#shopGreenGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground italic">
              No historical trend data available for this branch.
            </div>
          )}
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border space-y-4 shadow-xs">
          <h3 className="font-display text-base font-bold text-foreground">
            Category Breakdown
          </h3>

          {perf.categoryBreakdown && perf.categoryBreakdown.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={perf.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {perf.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => fmtCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {perf.categoryBreakdown.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="font-medium text-foreground">{cat.name}</span>
                    </div>
                    <div className="font-bold text-foreground">
                      {fmtCurrency(cat.value)}{" "}
                      <span className="text-muted-foreground font-normal">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground italic">
              No category breakdown available.
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Recent Transactions ({currentShop.name})
          </h3>
        </div>

        {perf.recentTransactions && perf.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {perf.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{tx.date}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{tx.description}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{tx.category}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          tx.type === "income"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {tx.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold font-mono ${
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}{fmtCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No transactions recorded yet for this shop branch.
          </div>
        )}
      </div>
    </div>
  );
}
