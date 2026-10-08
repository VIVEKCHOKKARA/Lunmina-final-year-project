import { useState, useEffect, useCallback } from "react";
import { fetchTransactions } from "@/lib/api";
import { performLinearRegression, predictFuture } from "@/lib/ml";

export type ForecastResult = {
    period: string;
    predicted_revenue: number;
    predicted_expenses: number;
    confidence: number;
};

export type ChartPoint = {
    month: string;
    actual: number | null;
    forecast: number | null;
};

export function useForecasting() {
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const calculateForecast = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch transactions from API
            const transactions = await fetchTransactions();

            if (!transactions || transactions.length === 0) {
                setLoading(false);
                return;
            }

            // Group by month
            const monthlyData: Record<string, { income: number; expense: number }> = {};
            transactions.forEach(t => {
                const date = new Date(t.date);
                const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { income: 0, expense: 0 };
                }

                if (t.type === "income") monthlyData[monthKey].income += Number(t.amount);
                else monthlyData[monthKey].expense += Number(t.amount);
            });

            const monthKeys = Object.keys(monthlyData).sort();
            const revenues = monthKeys.map(k => monthlyData[k].income);
            const expenses = monthKeys.map(k => monthlyData[k].expense);

            // Perform Linear Regression
            const revReg = performLinearRegression(revenues);
            const expReg = performLinearRegression(expenses);

            const n = revenues.length;
            const futureCount = 6;

            const projectedRevenues = predictFuture(revReg.slope, revReg.intercept, n, futureCount);
            const projectedExpenses = predictFuture(expReg.slope, expReg.intercept, n, futureCount);

            // Prepare Chart Data
            const historicalPoints: ChartPoint[] = monthKeys.map((k, i) => {
                const date = new Date(k + "-01");
                return {
                    month: date.toLocaleString('default', { month: 'short' }),
                    actual: revenues[i],
                    forecast: null
                };
            });

            // Last historical point to connect lines
            const lastHistoricalDate = new Date(monthKeys[n - 1] + "-01");

            const forecastPoints: ChartPoint[] = [];
            const newForecasts: ForecastResult[] = [];

            for (let i = 0; i < futureCount; i++) {
                const futureDate = new Date(lastHistoricalDate.getFullYear(), lastHistoricalDate.getMonth() + i + 1, 1);
                const monthName = futureDate.toLocaleString('default', { month: 'short' });
                const periodName = futureDate.toLocaleString('default', { month: 'short', year: '2-digit' });

                forecastPoints.push({
                    month: monthName,
                    actual: null,
                    forecast: projectedRevenues[i]
                });

                newForecasts.push({
                    period: periodName,
                    predicted_revenue: projectedRevenues[i],
                    predicted_expenses: projectedExpenses[i],
                    confidence: Math.max(0.5, 0.95 - i * 0.05) * revReg.r2
                });
            }

            setChartData([...historicalPoints, ...forecastPoints]);
            setForecasts(newForecasts);

        } catch (e: any) {
            console.error("Forecasting error:", e);
            setError(e.message || "An error occurred during forecasting");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        calculateForecast();
        // Poll every 30 seconds instead of Supabase realtime
        const interval = setInterval(calculateForecast, 30000);
        return () => clearInterval(interval);
    }, [calculateForecast]);

    return { loading, chartData, forecasts, error, refresh: calculateForecast };
}
