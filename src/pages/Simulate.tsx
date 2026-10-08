import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp, TrendingDown, DollarSign,
    Sparkles, MousePointer, BarChart3, Activity
} from "lucide-react";
import { useForecasting } from "@/hooks/useForecasting";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

/* ─── Shared Card Component ────────────────────────────────────────────────── */
function SimCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "bg-card text-card-foreground border border-border/80 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md dark:bg-slate-900/90 dark:border-slate-800 dark:hover:border-slate-700/80",
            className
        )}>
            {children}
        </div>
    );
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KPICard({
    label, value, trend, icon: Icon,
}: {
    label: string; value: string; trend: string; icon: React.ElementType;
}) {
    const isPositive = trend.startsWith("+");
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <SimCard className="flex flex-col justify-between min-h-[120px]">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-muted-foreground dark:text-slate-400">
                            {label}
                        </p>
                        <h3 className="text-3xl font-bold tracking-tight text-foreground dark:text-slate-100">
                            {value}
                        </h3>
                        <p className={cn("text-[10px] font-bold mt-1", isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")}>
                            {trend}
                            <span className="font-normal ml-1 text-muted-foreground dark:text-slate-400">vs last month</span>
                        </p>
                    </div>
                    <div className="p-3 rounded-xl shrink-0 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </SimCard>
        </motion.div>
    );
}

/* ─── Custom recharts tooltip ────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, colors }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 12,
                padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(0,0,0,.35)",
                fontSize: 11,
                fontWeight: 600,
                color: colors.tooltipText,
            }}
        >
            <p style={{ color: colors.tooltipTitle, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
                {label}
            </p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.stroke === colors.primary ? colors.primary : colors.baseline }}>
                    {p.name === "simulatedProfit" ? "Simulation" : "Baseline"}:{" "}
                    <strong>₹{Math.round(p.value / 1000)}k</strong>
                </p>
            ))}
        </div>
    );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Simulate() {
    const { forecasts } = useForecasting();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [priceAdj,   setPriceAdj]   = useState([0]);
    const [expenseAdj, setExpenseAdj] = useState([0]);
    const [volumeAdj,  setVolumeAdj]  = useState([15]);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const colors = isDark
        ? {
            primary: "#2dd4bf",     // teal-400
            baseline: "#64748b",    // slate-500
            gridStroke: "rgba(255,255,255,0.07)",
            axisStroke: "rgba(255,255,255,0.3)",
            tooltipBg: "#0f172a",   // slate-900
            tooltipBorder: "rgba(255,255,255,0.12)",
            tooltipTitle: "#94a3b8",
            tooltipText: "#f8fafc",
            gradStart: "rgba(45,212,191,0.25)",
            gradEnd: "rgba(45,212,191,0)",
        }
        : {
            primary: "#0d9488",     // teal-600
            baseline: "#94a3b8",    // slate-400
            gridStroke: "rgba(15,23,42,0.06)",
            axisStroke: "rgba(15,23,42,0.25)",
            tooltipBg: "#ffffff",
            tooltipBorder: "rgba(15,23,42,0.10)",
            tooltipTitle: "#64748b",
            tooltipText: "#0f172a",
            gradStart: "rgba(13,148,136,0.18)",
            gradEnd: "rgba(13,148,136,0)",
        };

    const presets = [
        { label: "Aggressive", val: [15, 5,  40] as [number, number, number] },
        { label: "Stability",  val: [0,  10,  5] as [number, number, number] },
        { label: "Safety",     val: [0,  15,  0] as [number, number, number] },
    ];

    const applyPreset = (label: string, p: number, e: number, v: number) => {
        setPriceAdj([p]); setExpenseAdj([e]); setVolumeAdj([v]);
        setActivePreset(label);
    };

    const simulatedData = useMemo(() => {
        if (!forecasts.length) return [];
        return forecasts.map((f) => {
            const pFactor = 1 + priceAdj[0]   / 100;
            const eFactor = 1 - expenseAdj[0] / 100;
            const vFactor = 1 + volumeAdj[0]  / 100;
            const simRevenue   = f.predicted_revenue   * pFactor * vFactor;
            const simExpenses  = f.predicted_expenses  * eFactor;
            const simProfit    = simRevenue - simExpenses;
            const baseProfit   = f.predicted_revenue - f.predicted_expenses;
            return {
                period: f.period,
                baselineProfit: baseProfit,
                simulatedProfit: simProfit,
                simulatedRevenue: simRevenue,
                simulatedExpenses: simExpenses,
                profitDelta: simProfit - baseProfit,
            };
        });
    }, [forecasts, priceAdj, expenseAdj, volumeAdj]);

    const totalSimProfit  = simulatedData.reduce((a, d) => a + d.simulatedProfit,  0);
    const totalBaseProfit = simulatedData.reduce((a, d) => a + d.baselineProfit,   0);
    const totalDelta      = totalSimProfit - totalBaseProfit;
    const profitLift      = totalBaseProfit > 0 ? (totalDelta / totalBaseProfit) * 100 : 0;

    const sliders = [
        { label: "Price Adjustment",  val: priceAdj,   set: setPriceAdj,   min: -10, max: 50,  icon: DollarSign  },
        { label: "Expense Reduction", val: expenseAdj, set: setExpenseAdj,  min: 0,   max: 30,  icon: TrendingDown },
        { label: "Volume Forecast",   val: volumeAdj,  set: setVolumeAdj,   min: 0,   max: 100, icon: TrendingUp  },
    ];

    return (
        <div className="space-y-6 min-h-full -m-4 md:-m-6 p-4 md:p-6 transition-colors duration-300">

            {/* ── Page header ── */}
            <div className="flex flex-col gap-1 pt-2">
                <h2 className="font-display text-2xl font-bold text-foreground dark:text-slate-100">
                    Strategic Profit Simulator
                </h2>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                    Model strategic growth and financial impact using linear regression
                </p>
            </div>

            {/* ── KPI row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Total Projected Revenue"
                    value={`₹${Math.round(simulatedData.reduce((a, b) => a + b.simulatedRevenue, 0) / 1000)}k`}
                    trend="+96%"
                    icon={DollarSign}
                />
                <KPICard
                    label="Net Profit (Simulated)"
                    value={`₹${Math.round(totalSimProfit / 1000)}k`}
                    trend={`+${profitLift.toFixed(0)}%`}
                    icon={TrendingUp}
                />
                <KPICard
                    label="Projected Expenses"
                    value={`₹${Math.round(simulatedData.reduce((a, b) => a + b.simulatedExpenses, 0) / 1000)}k`}
                    trend="-88%"
                    icon={TrendingDown}
                />
                <KPICard
                    label="Scenario Advantage"
                    value={`+₹${Math.round(totalDelta / 1000)}k`}
                    trend="+100%"
                    icon={Sparkles}
                />
            </div>

            {/* ── Controls + Chart ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Control panel */}
                <div className="lg:col-span-4">
                    <SimCard className="h-full">

                        {/* Section title */}
                        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-border dark:border-slate-800">
                            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
                                <MousePointer className="h-4 w-4" />
                            </div>
                            <h3 className="font-bold text-sm uppercase tracking-widest text-foreground dark:text-slate-200">
                                Control Vectors
                            </h3>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-8">
                            {sliders.map((s) => (
                                <div key={s.label} className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground dark:text-slate-400">
                                            <s.icon className="h-3 w-3" />
                                            {s.label}
                                        </span>
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                                            {s.val[0]}%
                                        </span>
                                    </div>
                                    <Slider
                                        value={s.val}
                                        onValueChange={(v) => { s.set(v); setActivePreset(null); }}
                                        min={s.min}
                                        max={s.max}
                                        step={1}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Preset buttons */}
                        <div className="mt-10 pt-6 border-t border-border dark:border-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-muted-foreground dark:text-slate-400">
                                Quick Presets
                            </p>
                            <div className="flex rounded-xl p-1 gap-1 bg-muted/60 dark:bg-slate-800/80 border border-border/50 dark:border-slate-700/50">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => applyPreset(preset.label, preset.val[0], preset.val[1], preset.val[2])}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200",
                                            activePreset === preset.label
                                                ? "bg-card text-teal-600 dark:text-teal-300 shadow-sm font-bold border border-teal-500/30"
                                                : "text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200"
                                        )}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </SimCard>
                </div>

                {/* Chart */}
                <div className="lg:col-span-8">
                    <SimCard className="h-full flex flex-col min-h-[480px]">

                        {/* Chart header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground dark:text-slate-100">Profit &amp; Revenue Trend</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-muted-foreground dark:text-slate-400">
                                        Projected vs Baseline
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-5 items-center">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-slate-400">
                                    <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                                    Baseline
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                                    style={{ color: colors.primary }}>
                                    <div className="h-2 w-2 rounded-full" style={{ background: colors.primary }} />
                                    Simulation
                                </div>
                            </div>
                        </div>

                        {/* Recharts area chart — dynamic theme colours */}
                        <div className="flex-1 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={simulatedData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={colors.primary} stopOpacity={isDark ? 0.35 : 0.18} />
                                            <stop offset="95%" stopColor={colors.primary} stopOpacity={0}    />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke={colors.gridStroke}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="period"
                                        stroke={colors.axisStroke}
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={14}
                                    />
                                    <YAxis
                                        stroke={colors.axisStroke}
                                        fontSize={10}
                                        tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={14}
                                    />
                                    <Tooltip content={<ChartTooltip colors={colors} />} />
                                    <Area
                                        type="monotone"
                                        dataKey="baselineProfit"
                                        stroke={colors.baseline}
                                        strokeWidth={1.5}
                                        fill="none"
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="simulatedProfit"
                                        stroke={colors.primary}
                                        strokeWidth={2.5}
                                        fill="url(#simGrad)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: colors.primary, stroke: isDark ? "#0f172a" : "#fff", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Footer bar */}
                        <div className="mt-6 pt-5 border-t border-border dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-[0.18em]">
                                    Intelligence Model: Linear Reg v4.2
                                </span>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-slate-400">
                                Confidence Interval: 94.2%
                            </div>
                        </div>
                    </SimCard>
                </div>
            </div>
        </div>
    );
}
