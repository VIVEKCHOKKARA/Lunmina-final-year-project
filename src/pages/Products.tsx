import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Star, DollarSign, HelpCircle, AlertTriangle } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useState, useEffect, useCallback } from "react";
import { fetchProducts } from "@/lib/api";
import AddProductDialog from "@/components/AddProductDialog";
import { toast } from "sonner";

const CLUSTER_COLORS: Record<string, string> = {
  star: "hsl(172, 66%, 50%)",
  "cash-cow": "hsl(142, 69%, 58%)",
  "question-mark": "hsl(45, 90%, 60%)",
  underperformer: "hsl(351, 89%, 70%)",
};
const CLUSTER_ICONS: Record<string, any> = { star: Star, "cash-cow": DollarSign, "question-mark": HelpCircle, underperformer: AlertTriangle };
const CLUSTER_LABELS: Record<string, string> = { star: "Stars", "cash-cow": "Cash Cows", "question-mark": "Question Marks", underperformer: "Underperformers" };

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-card border border-border p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground">{d.name}</p>
      <p className="text-xs text-muted-foreground">Units: {d.x?.toLocaleString("en-IN")} | Revenue: ₹{d.y?.toLocaleString("en-IN")}</p>
    </div>
  );
};

type Product = { id: string; name: string; category: string; price: number; units_sold: number; revenue: number; trend: string; cluster: string };

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data || []);
    } catch (err: any) {
      toast.error("Failed to load products");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
    // Poll every 30 seconds instead of Supabase realtime
    const interval = setInterval(loadProducts, 30000);
    return () => clearInterval(interval);
  }, [loadProducts]);

  const scatterData = products.map(p => ({ x: p.units_sold, y: p.revenue, name: p.name, cluster: p.cluster }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Product Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">Clustering analysis grouped by sales velocity and revenue</p>
        </div>
        <AddProductDialog onAdded={loadProducts} />
      </div>

      <div className="flex flex-wrap gap-4">
        {Object.entries(CLUSTER_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ background: CLUSTER_COLORS[key] }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <motion.div className="glow-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Units Sold vs Revenue</h3>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" />
              <XAxis dataKey="x" name="Units Sold" stroke="hsl(215, 20%, 45%)" fontSize={12} label={{ value: "Units Sold", position: "insideBottom", offset: -5, fill: "hsl(215, 20%, 45%)", fontSize: 11 }} />
              <YAxis dataKey="y" name="Revenue" stroke="hsl(215, 20%, 45%)" fontSize={12} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={scatterData}>
                {scatterData.map((entry, i) => <Cell key={i} fill={CLUSTER_COLORS[entry.cluster]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <motion.div className="glow-card overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-muted-foreground">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No products yet. Add one to get started!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Product</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Category</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Price</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Units Sold</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Revenue</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Trend</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Cluster</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const ClusterIcon = CLUSTER_ICONS[p.cluster] || HelpCircle;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-4 text-foreground font-medium">{p.name}</td>
                      <td className="p-4 text-muted-foreground">{p.category}</td>
                      <td className="p-4 text-right text-foreground">₹{p.price.toLocaleString("en-IN")}</td>
                      <td className="p-4 text-right text-muted-foreground">{p.units_sold.toLocaleString("en-IN")}</td>
                      <td className="p-4 text-right text-foreground">₹{p.revenue.toLocaleString("en-IN")}</td>
                      <td className="p-4 text-center">
                        {p.trend === "up" && <TrendingUp className="h-4 w-4 text-secondary mx-auto" />}
                        {p.trend === "down" && <TrendingDown className="h-4 w-4 text-destructive mx-auto" />}
                        {p.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium" style={{ color: CLUSTER_COLORS[p.cluster], background: `${CLUSTER_COLORS[p.cluster]}15` }}>
                          <ClusterIcon className="h-3 w-3" />
                          {CLUSTER_LABELS[p.cluster]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
