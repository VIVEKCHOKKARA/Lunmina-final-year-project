import { useState, useEffect, useCallback } from "react";
import { fetchTransactions } from "@/lib/api";

export type Anomaly = {
  id: string;
  date: string;
  type: "spike" | "drop" | "unusual";
  metric: string;
  description: string;
  severity: "high" | "medium" | "low";
  value: number;
  expected: number;
};

export function useAnomalies() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const detectAnomalies = useCallback((transactions: any[]) => {
    const detected: Anomaly[] = [];
    const categories = Array.from(new Set(transactions.map(t => t.category)));

    categories.forEach(cat => {
      const catTransactions = transactions.filter(t => t.category === cat);
      if (catTransactions.length < 3) return;

      const amounts = catTransactions.map(t => Number(t.amount));
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / amounts.length);

      catTransactions.forEach(t => {
        const val = Number(t.amount);
        if (val > avg + 2.5 * stdDev) {
          detected.push({
            id: t.id,
            date: t.date,
            type: "spike",
            metric: `${cat} Expense`,
            description: `Unusually high ${cat} cost detected. This is ${Math.round((val/avg)*100)}% above your average baseline.`,
            severity: val > avg * 4 ? "high" : "medium",
            value: val,
            expected: Math.round(avg)
          });
        }
      });
    });

    // Check for drops in income
    const incomeTrend: Record<string, number> = {};
    transactions.filter(t => t.type === "income").forEach(t => {
      const month = t.date.substring(0, 7);
      incomeTrend[month] = (incomeTrend[month] || 0) + Number(t.amount);
    });
    
    const months = Object.keys(incomeTrend).sort();
    if (months.length >= 2) {
      const latest = months[months.length-1];
      const prev = months[months.length-2];
      if (incomeTrend[latest] < incomeTrend[prev] * 0.6) {
        detected.push({
          id: `drop-${latest}`,
          date: new Date().toISOString().split('T')[0],
          type: "drop",
          metric: "Monthly Revenue",
          description: `Revenue in ${latest} is significantly lower than ${prev}. Investigate external market factors or internal platform issues.`,
          severity: "high",
          value: incomeTrend[latest],
          expected: incomeTrend[prev]
        });
      }
    }

    return detected.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await fetchTransactions();
    if (data) setAnomalies(detectAnomalies(data));
    setLoading(false);
  }, [detectAnomalies]);

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds instead of Supabase realtime
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { anomalies, loading };
}
