import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Briefcase, Loader2 } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { fetchBusinessOwnerProfileSummary, type BusinessOwnerOverallSummary } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const fmtCurrency = (val: number | undefined | null) => `₹${(val ?? 0).toLocaleString("en-IN")}`;
const fmtNumber = (val: number | undefined | null) => (val ?? 0).toLocaleString("en-IN");

export function BusinessOwnerOverallProfileBanner() {
  const [summary, setSummary] = useState<BusinessOwnerOverallSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchBusinessOwnerProfileSummary()
      .then((res) => {
        if (isMounted) setSummary(res);
      })
      .catch((err: any) => {
        if (isMounted) {
          toast({
            title: "Profile Summary Error",
            description: err?.message || "Failed to load Business Owner profile summary.",
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
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center space-y-3 shadow-xs">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground animate-pulse font-medium">
          Loading Business Owner Overall Profile Performance...
        </p>
      </div>
    );
  }

  const data = summary || {
    shopsCount: 0,
    totalRevenue: 0,
    netProfit: 0,
    totalExpenses: 0,
    totalOrders: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Business Owner Overall Profile
            </h2>
            <p className="text-xs text-muted-foreground">
              Combined performance across all {data.shopsCount} authorized shop locations
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
          All Authorized Shops Combined
        </span>
      </div>

      {/* 2x2 Grid of Top-Level Overall Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Revenue"
          value={fmtCurrency(data.totalRevenue)}
          change="Sum across all authorized shops"
          changeType="positive"
          icon={DollarSign}
        />

        <MetricCard
          label="Total Net Profit"
          value={fmtCurrency(data.netProfit)}
          change="Combined net profit portfolio"
          changeType="positive"
          icon={TrendingUp}
          variant="success"
        />

        <MetricCard
          label="Total Expenses"
          value={fmtCurrency(data.totalExpenses)}
          change="Combined operational costs"
          changeType="negative"
          icon={TrendingDown}
          variant="alert"
        />

        <MetricCard
          label="Total Orders"
          value={fmtNumber(data.totalOrders)}
          change="Orders from all authorized shops"
          changeType="positive"
          icon={ShoppingCart}
        />
      </div>
    </div>
  );
}
