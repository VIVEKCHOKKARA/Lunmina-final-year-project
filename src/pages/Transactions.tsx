import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { fetchTransactions } from "@/lib/api";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { toast } from "sonner";

type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
};

export default function Transactions() {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions();
      setTransactions(data || []);
    } catch (err: any) {
      toast.error("Failed to load transactions");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();
    // Poll every 30 seconds instead of Supabase realtime
    const interval = setInterval(loadTransactions, 30000);
    return () => clearInterval(interval);
  }, [loadTransactions]);

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">Track income, expenses, and financial records</p>
        </div>
        <AddTransactionDialog onAdded={loadTransactions} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div className="glow-card-success p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="metric-label">Total Income</p>
          <p className="metric-value text-secondary">₹{totalIncome.toLocaleString("en-IN")}</p>
        </motion.div>
        <motion.div className="glow-card-alert p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="metric-label">Total Expenses</p>
          <p className="metric-value text-destructive">₹{totalExpenses.toLocaleString("en-IN")}</p>
        </motion.div>
        <motion.div className="glow-card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="metric-label">Net</p>
          <p className="metric-value text-primary">₹{(totalIncome - totalExpenses).toLocaleString("en-IN")}</p>
        </motion.div>
      </div>

      <div className="flex gap-2">
        {(["all", "income", "expense"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", filter === f ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:text-foreground")}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <motion.div className="glow-card overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-muted-foreground">Loading transactions...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No transactions yet. Add one to get started!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Description</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Category</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="p-4 text-muted-foreground">{t.date}</td>
                    <td className="p-4 text-foreground">{t.description}</td>
                    <td className="p-4"><span className="rounded-md bg-accent px-2 py-1 text-xs text-muted-foreground">{t.category}</span></td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.type === "income" ? <ArrowUpRight className="h-4 w-4 text-secondary" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                        <span className={cn("font-medium", t.type === "income" ? "text-secondary" : "text-destructive")}>₹{t.amount.toLocaleString("en-IN")}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
