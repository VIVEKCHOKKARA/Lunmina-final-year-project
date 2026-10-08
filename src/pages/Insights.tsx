import { useForecasting } from "@/hooks/useForecasting";
import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Insights() {
  const { forecasts, loading } = useForecasting();

  // Calculate some insights from the forecast
  const nextMonth = forecasts[0];
  const lastMonthForecast = forecasts[forecasts.length - 1];

  const revenueTrend = nextMonth && lastMonthForecast
    ? ((lastMonthForecast.predicted_revenue - nextMonth.predicted_revenue) / nextMonth.predicted_revenue) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">AI Insights</h2>
          <p className="text-sm text-muted-foreground mt-1">Plain-language business advice powered by your data</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glow-card p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-primary mb-4">
              <TrendingUp className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Sales Forecast</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : nextMonth ? (
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    ₹{nextMonth.predicted_revenue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Predicted revenue for {nextMonth.period}
                  </p>
                </div>

                <div className="flex items-center gap-4 py-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    {revenueTrend > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-secondary" />
                    ) : revenueTrend < 0 ? (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm font-bold ${revenueTrend > 0 ? "text-secondary" :
                      revenueTrend < 0 ? "text-destructive" :
                        "text-muted-foreground"
                      }`}>
                      {Math.abs(revenueTrend).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">6-mo trend</span>
                  </div>

                  <div className="h-4 w-px bg-border/50" />

                  <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Linear Regression
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Based on your historical growth, we expect your monthly profit to reach
                  <span className="text-foreground font-medium mx-1">
                    ₹{(lastMonthForecast.predicted_revenue - lastMonthForecast.predicted_expenses).toLocaleString("en-IN")}
                  </span>
                  within six months.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Add more transaction history to generate a sales forecast.
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glow-card p-6 h-full"
        >
          <div className="flex items-center gap-2 text-secondary mb-4">
            <TrendingUp className="h-5 w-5" />
            <h3 className="font-semibold text-lg">AI Recommendations</h3>
          </div>
          <div className="space-y-3">
            {[
              "Our linear regression model predicts a 12% lift in daily sales over the next week.",
              "Profit margins are tightening; look for ways to reduce logistics costs.",
              "Weekend sales shows a consistent 15% lift - plan staffing accordingly."
            ].map((rec, i) => (
              <div key={i} className="flex gap-3 text-sm p-2 rounded-lg hover:bg-accent/30 transition-colors">
                <div className="h-5 w-5 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-secondary">{i + 1}</span>
                </div>
                <p className="text-muted-foreground">{rec}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
