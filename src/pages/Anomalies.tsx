import { motion } from "framer-motion";
import { useAnomalies } from "@/hooks/useAnomalies";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react";

const severityStyles: Record<string, string> = {
  high: "glow-card-alert animate-pulse-glow",
  medium: "glow-card border-amber-500/50",
  low: "glow-card",
};

const typeIcons: Record<string, any> = {
  spike: TrendingUp,
  drop: TrendingDown,
  unusual: Activity,
};

export default function Anomalies() {
  const { anomalies, loading } = useAnomalies();

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Running AI pattern matching algorithms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Anomaly Detection</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-identified unusual patterns and financial risks</p>
        </div>
      </div>

      {anomalies.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-accent/50 p-3">
          <AlertTriangle className={cn("h-5 w-5 shrink-0", anomalies.some(a => a.severity === "high") ? "text-destructive" : "text-amber-500")} />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{anomalies.filter((a) => a.severity === "high").length} critical alert(s)</strong> require immediate attention.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
          <Activity className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-500">All financial patterns are within normal operational parameters. No anomalies detected.</p>
        </div>
      )}

      <div className="space-y-4">
        {anomalies.map((a, i) => {
          const Icon = typeIcons[a.type] || Activity;
          return (
            <motion.div
              key={a.id}
              className={cn(severityStyles[a.severity], "p-5")}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className={cn(
                  "rounded-lg p-2.5 shrink-0",
                  a.severity === "high" ? "bg-destructive/20" : "bg-accent",
                )}>
                  <Icon className={cn("h-5 w-5", a.severity === "high" ? "text-destructive" : "text-primary")} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base font-semibold text-foreground">{a.metric}</h3>
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
                      a.severity === "high" && "bg-destructive/20 text-destructive",
                      a.severity === "medium" && "bg-amber-500/20 text-amber-500",
                      a.severity === "low" && "bg-accent text-muted-foreground",
                    )}>
                      {a.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.date}</span>
                  </div>
                  <p className="insight-text">{a.description}</p>
                  <div className="flex gap-6 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Actual: </span>
                      <span className="font-medium text-foreground">₹{a.value.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Baseline: </span>
                      <span className="font-medium text-foreground">₹{a.expected.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deviation: </span>
                      <span className={cn("font-medium", a.type === "spike" ? "text-destructive" : "text-primary")}>
                        {a.type === "drop" ? "-" : "+"}
                        {a.expected > 0 ? Math.abs(Math.round(((a.value - a.expected) / a.expected) * 100)) : 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

