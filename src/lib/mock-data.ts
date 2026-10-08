// Mock data for the analytics dashboard

export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  unitsSold: number;
  revenue: number;
  trend: "up" | "down" | "stable";
  cluster: "star" | "cash-cow" | "question-mark" | "underperformer";
};

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

export type PricingSuggestion = {
  id: string;
  product: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  confidence: number;
  expectedImpact: string;
};

export const monthlyRevenue = [
  { month: "Jul", revenue: 32000, expenses: 24000, profit: 8000 },
  { month: "Aug", revenue: 35000, expenses: 25500, profit: 9500 },
  { month: "Sep", revenue: 31000, expenses: 23000, profit: 8000 },
  { month: "Oct", revenue: 42000, expenses: 28000, profit: 14000 },
  { month: "Nov", revenue: 48000, expenses: 30000, profit: 18000 },
  { month: "Dec", revenue: 55000, expenses: 33000, profit: 22000 },
  { month: "Jan", revenue: 41000, expenses: 29000, profit: 12000 },
  { month: "Feb", revenue: 44000, expenses: 27000, profit: 17000 },
  { month: "Mar", revenue: 52000, expenses: 31000, profit: 21000 },
];

export const forecastData = [
  { month: "Mar", actual: 52000, forecast: null },
  { month: "Apr", actual: null, forecast: 56000 },
  { month: "May", actual: null, forecast: 61000 },
  { month: "Jun", actual: null, forecast: 58000 },
  { month: "Jul", actual: null, forecast: 65000 },
  { month: "Aug", actual: null, forecast: 72000 },
];

export const products: Product[] = [
  { id: "1", name: "Wireless Earbuds Pro", category: "Electronics", price: 79.99, unitsSold: 1240, revenue: 99187, trend: "up", cluster: "star" },
  { id: "2", name: "Smart Water Bottle", category: "Lifestyle", price: 34.99, unitsSold: 890, revenue: 31141, trend: "up", cluster: "star" },
  { id: "3", name: "USB-C Hub 7-in-1", category: "Electronics", price: 49.99, unitsSold: 620, revenue: 30994, trend: "stable", cluster: "cash-cow" },
  { id: "4", name: "Bamboo Desk Organizer", category: "Office", price: 24.99, unitsSold: 450, revenue: 11246, trend: "down", cluster: "question-mark" },
  { id: "5", name: "LED Desk Lamp", category: "Office", price: 59.99, unitsSold: 310, revenue: 18597, trend: "stable", cluster: "cash-cow" },
  { id: "6", name: "Yoga Mat Premium", category: "Lifestyle", price: 44.99, unitsSold: 180, revenue: 8098, trend: "down", cluster: "underperformer" },
  { id: "7", name: "Phone Stand Adjustable", category: "Electronics", price: 19.99, unitsSold: 920, revenue: 18391, trend: "up", cluster: "star" },
  { id: "8", name: "Notebook Set (3-Pack)", category: "Office", price: 12.99, unitsSold: 1500, revenue: 19485, trend: "stable", cluster: "cash-cow" },
];

export const transactions: Transaction[] = [
  { id: "1", date: "2026-03-19", description: "Wholesale Electronics Order", category: "Inventory", amount: 8500, type: "expense" },
  { id: "2", date: "2026-03-19", description: "Online Store Sales", category: "Sales", amount: 4200, type: "income" },
  { id: "3", date: "2026-03-18", description: "Shopify Subscription", category: "Software", amount: 79, type: "expense" },
  { id: "4", date: "2026-03-18", description: "In-Store Sales", category: "Sales", amount: 3100, type: "income" },
  { id: "5", date: "2026-03-17", description: "Shipping & Logistics", category: "Operations", amount: 1200, type: "expense" },
  { id: "6", date: "2026-03-17", description: "Marketplace Sales", category: "Sales", amount: 2800, type: "income" },
  { id: "7", date: "2026-03-16", description: "Office Rent", category: "Overhead", amount: 2500, type: "expense" },
  { id: "8", date: "2026-03-16", description: "Bulk Order - Corporate", category: "Sales", amount: 12000, type: "income" },
];

export const anomalies: Anomaly[] = [
  { id: "1", date: "2026-03-15", type: "spike", metric: "Returns", description: "Return rate jumped 340% for Wireless Earbuds Pro. Possible batch defect.", severity: "high", value: 89, expected: 20 },
  { id: "2", date: "2026-03-12", type: "drop", metric: "Daily Sales", description: "Revenue dropped 45% on Thursday. Check if a competitor ran a flash sale.", severity: "medium", value: 1800, expected: 3200 },
  { id: "3", date: "2026-03-10", type: "unusual", metric: "Expense Ratio", description: "Shipping costs increased 28% without a corresponding rise in orders.", severity: "medium", value: 1540, expected: 1200 },
  { id: "4", date: "2026-03-08", type: "spike", metric: "Inventory", description: "Bamboo Desk Organizer stock rose to 6-month supply. Risk of overstock.", severity: "low", value: 2400, expected: 800 },
];

export const pricingSuggestions: PricingSuggestion[] = [
  { id: "1", product: "Wireless Earbuds Pro", currentPrice: 79.99, suggestedPrice: 84.99, reason: "High demand + low price elasticity. Competitors priced at $89-99.", confidence: 87, expectedImpact: "+$6,200/mo revenue" },
  { id: "2", product: "Bamboo Desk Organizer", currentPrice: 24.99, suggestedPrice: 19.99, reason: "Declining sales. A 20% price cut could boost volume by 35%.", confidence: 72, expectedImpact: "+120 units/mo" },
  { id: "3", product: "Smart Water Bottle", currentPrice: 34.99, suggestedPrice: 39.99, reason: "Trending product with strong reviews. Market supports premium.", confidence: 81, expectedImpact: "+$4,450/mo revenue" },
  { id: "4", product: "USB-C Hub 7-in-1", currentPrice: 49.99, suggestedPrice: 44.99, reason: "New competitor at $42. Slight reduction keeps market share.", confidence: 68, expectedImpact: "Retain 90% volume" },
];

export const aiInsights = [
  { icon: "trending-up", title: "Revenue Momentum", text: "Your revenue has grown 22% over the last 3 months. At this pace, you're on track to hit $620K annual revenue — up from $510K last year." },
  { icon: "package", title: "Inventory Alert", text: "Bamboo Desk Organizer has 6 months of stock but declining sales. Consider a bundle deal with your Notebook Set to move inventory." },
  { icon: "zap", title: "Quick Win", text: "Raising Wireless Earbuds Pro by $5 could add ~$6,200/mo with minimal demand impact. Your return on this change is estimated at 94%." },
  { icon: "shield", title: "Risk Watch", text: "Shipping costs are rising faster than order volume. Renegotiate your logistics contract or explore a new 3PL provider to save ~$340/mo." },
  { icon: "users", title: "Customer Pattern", text: "Corporate bulk orders make up 28% of revenue but only 4% of transactions. Consider a dedicated B2B pricing page to grow this segment." },
];

export const categoryBreakdown = [
  { name: "Electronics", value: 148572, percentage: 56 },
  { name: "Lifestyle", value: 39239, percentage: 15 },
  { name: "Office", value: 49328, percentage: 19 },
  { name: "Other", value: 26300, percentage: 10 },
];

export const dailySales = [
  { day: "Mon", sales: 4200 },
  { day: "Tue", sales: 3800 },
  { day: "Wed", sales: 5100 },
  { day: "Thu", sales: 1800 },
  { day: "Fri", sales: 4600 },
  { day: "Sat", sales: 6200 },
  { day: "Sun", sales: 3900 },
];
