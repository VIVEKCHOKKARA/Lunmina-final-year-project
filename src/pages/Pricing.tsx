import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  fetchPricing,
  generatePricing,
  approvePricing,
  rejectPricing,
  type PricingRecommendation,
} from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import { useRealtime } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, X, Loader2, Sparkles, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type StatusMeta = { label: string; className: string; icon: typeof Check };

const STATUS_META: Record<PricingRecommendation["status"], StatusMeta> = {
  pending: {
    label: "Awaiting analyst approval",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  approved: {
    label: "Approved & applied",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: Check,
  },
  applied: {
    label: "Applied",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: Check,
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: X,
  },
};

export default function Pricing() {
  const { role } = useRole();
  const isAnalyst = role === "analyst";

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recs, setRecs] = useState<PricingRecommendation[]>([]);

  const load = useCallback(async () => {
    try {
      // Analyst reviews the pending queue; owner/manager see the full history
      // of what's been requested and decided.
      const data = await fetchPricing(isAnalyst ? "pending" : undefined);
      setRecs(data);
    } catch {
      toast.error("Failed to load pricing recommendations");
    } finally {
      setLoading(false);
    }
  }, [isAnalyst]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Refresh when another session generates/approves/rejects.
  useRealtime("pricing", load);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { suggestions, model_used } = await generatePricing();
      toast.success(
        suggestions.length
          ? `${suggestions.length} suggestion(s) generated (${model_used})`
          : "No pricing changes recommended right now"
      );
      await load();
    } catch {
      toast.error("Failed to generate suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (rec: PricingRecommendation) => {
    setBusyId(rec.id);
    try {
      await approvePricing(rec.id);
      toast.success(`Approved — ${rec.product} price applied`, {
        description: `₹${rec.currentPrice.toFixed(2)} → ₹${rec.suggestedPrice.toFixed(2)}`,
      });
      await load();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (rec: PricingRecommendation) => {
    setBusyId(rec.id);
    try {
      await rejectPricing(rec.id);
      toast.info(`Rejected suggestion for ${rec.product}`);
      await load();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Dynamic Pricing Engine</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAnalyst
              ? "Review AI price suggestions — approving applies the new price to the product."
              : "AI price suggestions require Financial Analyst approval before they take effect."}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2 self-start">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating…" : "Generate Suggestions"}
        </Button>
      </div>

      {/* Role banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-4",
          isAnalyst
            ? "bg-primary/10 border-primary/20 text-primary"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        )}
      >
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <p className="text-sm">
          {isAnalyst
            ? "You are reviewing pending recommendations. Approve to apply the suggested price, or reject to discard it."
            : "Generated suggestions are sent to the Financial Analyst for approval. Prices change only once approved."}
        </p>
      </div>

      {loading ? (
        <div className="glow-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : recs.length === 0 ? (
        <div className="glow-card p-12 text-center">
          <p className="text-muted-foreground italic">
            {isAnalyst
              ? "No pending recommendations to review. Generate suggestions to populate the queue."
              : "No recommendations yet. Click “Generate Suggestions” to request AI pricing analysis."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {recs.map((rec, i) => {
              const meta = STATUS_META[rec.status];
              const StatusIcon = meta.icon;
              const isIncrease = rec.suggestedPrice >= rec.currentPrice;
              const busy = busyId === rec.id;
              return (
                <motion.div
                  key={rec.id}
                  layout
                  className="glow-card p-5 space-y-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">{rec.product}</h3>
                      <p className="insight-text mt-1">{rec.reason}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border",
                        meta.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" /> {meta.label}
                    </span>
                  </div>

                  {/* Price display */}
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-display text-lg font-bold text-foreground">
                        ₹{rec.currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
                    <div className="rounded-lg px-3 py-2 text-center border bg-primary/10 border-primary/20">
                      <p className="text-xs text-primary">Suggested</p>
                      <p className={cn("font-display text-lg font-bold", isIncrease ? "text-emerald-400" : "text-amber-400")}>
                        ₹{rec.suggestedPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Confidence: </span>
                      <span
                        className={cn(
                          "font-medium",
                          rec.confidence >= 80 ? "text-secondary" : rec.confidence >= 70 ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {rec.confidence}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Impact: </span>
                      <span className="text-foreground font-medium">{rec.expectedImpact}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", rec.confidence >= 80 ? "bg-secondary" : "bg-primary")}
                      initial={{ width: 0 }}
                      animate={{ width: `${rec.confidence}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
                  </div>

                  {/* Analyst-only approval actions on pending items */}
                  {isAnalyst && rec.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(rec)}
                        disabled={busy}
                        size="sm"
                        className="flex-1 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(rec)}
                        disabled={busy}
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
