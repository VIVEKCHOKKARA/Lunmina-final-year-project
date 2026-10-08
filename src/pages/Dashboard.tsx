import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { aiInsights } from "@/lib/mock-data";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Lightbulb, TrendingUp as TrendUp, Package, Zap, Shield, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const CHART_COLORS = {
  teal: "hsl(172, 66%, 50%)",
  green: "hsl(142, 69%, 58%)",
  rose: "hsl(351, 89%, 70%)",
  slate: "hsl(217, 33%, 35%)",
};

const PIE_COLORS = [CHART_COLORS.teal, CHART_COLORS.green, CHART_COLORS.rose, CHART_COLORS.slate];

const insightIcons: Record<string, any> = {
  "trending-up": TrendUp,
  package: Package,
  zap: Zap,
  shield: Shield,
  users: Users,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg bg-card border border-border p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <p className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: ₹{p.value?.toLocaleString("en-IN")}
          </p>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [range, setRange] = useState("14");
  const historyDays = parseInt(range) || 7;
  const { metrics, revenueTrend, dailySales, categoryBreakdown, loading } = useDashboardData(historyDays);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse font-display">Synchronizing with business intelligence engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time business intelligence at a glance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={`₹${metrics.totalRevenue.toLocaleString("en-IN")}`} change={`+${metrics.revenueChange}% vs last month`} changeType="positive" icon={DollarSign} />
        <MetricCard label="Net Profit" value={`₹${metrics.netProfit.toLocaleString("en-IN")}`} change={`+${metrics.profitChange}% vs last month`} changeType="positive" icon={TrendingUp} variant="success" />
        <MetricCard label="Expenses" value={`₹${metrics.expenses.toLocaleString("en-IN")}`} change={`+${metrics.expensesChange}% vs last month`} changeType="negative" icon={TrendingDown} variant="alert" />
        <MetricCard label="Orders" value={metrics.orders.toLocaleString("en-IN")} change={`+${metrics.ordersChange}% vs last month`} changeType="positive" icon={ShoppingCart} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <motion.div
          className="glow-card p-5 lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Revenue & Profit Trend</h3>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 45%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(215, 20%, 45%)" fontSize={12} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.teal} fill="url(#tealGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.green} fill="url(#greenGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm italic">
              No transaction history available yet.
            </div>
          )}
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          className="glow-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Revenue by Category</h3>
          {categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0}>
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{cat.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm italic text-center">
              Add products with revenue to view breakdown.
            </div>
          )}
        </motion.div>
      </div>

      {/* Daily Sales + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          className="glow-card p-5 lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Growth Analysis & Forecasting</h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Historical trend + next 7-day linear projection
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex gap-3 mr-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary/30" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Forecast</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase whitespace-nowrap">Show last:</span>
                <input
                  type="number"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="w-12 h-9 bg-background/50 border border-border/50 rounded-md text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary text-center"
                  min="2"
                  max="180"
                />
                <span className="text-[10px] text-muted-foreground font-bold uppercase">days</span>
              </div>

              <div className="h-4 w-px bg-border/20 mx-1 hidden sm:block" />

              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/50">
                  <SelectValue placeholder="Select Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="14">Last 14 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="hsl(215, 20%, 45%)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={historyDays > 30 ? 6 : historyDays > 14 ? 1 : 0}
              />
              <YAxis stroke="hsl(215, 20%, 45%)" fontSize={10} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" name="Daily Sales" radius={[4, 4, 0, 0]}>
                {dailySales.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isForecast ? "hsl(172, 66%, 50%, 0.25)" : "hsl(172, 66%, 50%)"}
                    stroke={entry.isForecast ? "hsl(172, 66%, 50%)" : "none"}
                    strokeDasharray={entry.isForecast ? "4 2" : "0"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Insights Panel */}
        <motion.div
          className="glow-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">AI Intelligence</h3>
          </div>
          <div className="space-y-4">
            {aiInsights.slice(0, 4).map((insight, i) => {
              const IconComp = insightIcons[insight.icon] || Lightbulb;
              return (
                <div key={i} className="flex gap-3 rounded-xl bg-accent/40 p-3 hover:bg-accent/60 transition-colors cursor-default">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 md:line-clamp-none">{insight.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

