import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all transactions
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;

    // Group by month
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions || []) {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
      if (t.type === "income") monthlyData[month].income += Number(t.amount);
      else monthlyData[month].expense += Number(t.amount);
    }

    const months = Object.keys(monthlyData).sort();
    const revenues = months.map(m => monthlyData[m].income);
    const expenses = months.map(m => monthlyData[m].expense);

    // Simple linear regression for forecasting
    function linearRegression(values: number[]) {
      const n = values.length;
      if (n < 2) return { slope: 0, intercept: values[0] || 0 };
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i;
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return { slope, intercept };
    }

    const revReg = linearRegression(revenues);
    const expReg = linearRegression(expenses);
    const n = revenues.length;

    // Forecast next 6 months
    const forecasts = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const period = futureDate.toISOString().substring(0, 7);
      const idx = n + i;
      const predicted_revenue = Math.max(0, Math.round(revReg.intercept + revReg.slope * idx));
      const predicted_expenses = Math.max(0, Math.round(expReg.intercept + expReg.slope * idx));
      const confidence = Math.max(0.5, 0.95 - i * 0.05);
      forecasts.push({ period, predicted_revenue, predicted_expenses, confidence });
    }

    // Save forecasts to DB
    await supabase.from("forecasts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (forecasts.length > 0) {
      await supabase.from("forecasts").insert(forecasts);
    }

    return new Response(JSON.stringify({ forecasts, historical: { months, revenues, expenses } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forecast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
