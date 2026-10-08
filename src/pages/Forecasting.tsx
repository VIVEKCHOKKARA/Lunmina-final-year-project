import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useForecasting } from "@/hooks/useForecasting";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg bg-card border border-border p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: ₹{p.value?.toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

export default function Forecasting() {
  const { loading, chartData, forecasts, error, refresh } = useForecasting();

  const handleRefresh = async () => {
    await refresh();
    toast.success("Forecast updated based on latest transactions!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Sales Forecasting</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-powered predictions based on your transaction data</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading} className="gap-2 self-start">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Updating..." : "Update Forecast"}
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-4 text-primary">
        <TrendingUp className="h-5 w-5 shrink-0" />
        <p className="text-sm">
          A linear regression algorithm is analyzing your transaction history to project future revenue and expenses for the next 6 months.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {chartData.length > 0 && (
        <motion.div className="glow-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Revenue: Actual vs Forecast</h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 69%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 69%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="hsl(215, 20%, 45%)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(215, 20%, 45%)"
                  fontSize={12}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(172, 66%, 50%)"
                  fill="url(#actualGrad)"
                  strokeWidth={3}
                  name="Actual"
                  dot={{ r: 4, strokeWidth: 0, fill: "hsl(172, 66%, 50%)" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="hsl(142, 69%, 58%)"
                  fill="url(#forecastGrad)"
                  strokeWidth={3}
                  strokeDasharray="8 6"
                  name="Forecast"
                  dot={{ r: 4, strokeWidth: 0, fill: "hsl(142, 69%, 58%)" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {!loading && chartData.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 glow-card text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="font-semibold text-lg">No Financial History Yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            We need at least two months of transaction data to generate an accurate forecast.
          </p>
        </div>
      )}

      {forecasts.length > 0 && (
        <motion.div className="glow-card overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Period</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Predicted Revenue</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Predicted Expenses</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Predicted Profit</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="p-4 text-foreground font-medium">{f.period}</td>
                    <td className="p-4 text-right text-secondary font-semibold">₹{f.predicted_revenue.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-right text-destructive">₹{f.predicted_expenses.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-right text-primary font-semibold">₹{(f.predicted_revenue - f.predicted_expenses).toLocaleString("en-IN")}</td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${f.confidence > 0.8 ? "bg-green-500/10 text-green-500" :
                          f.confidence > 0.6 ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-red-500/10 text-red-500"
                        }`}>
                        {Math.round(f.confidence * 100)}% Match
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
