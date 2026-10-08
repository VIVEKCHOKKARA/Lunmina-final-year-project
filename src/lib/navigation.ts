import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Lightbulb,
  BarChart3,
  ShoppingBag,
  MessageSquare,
  Wand2,
  PlayCircle,
  Upload,
  Lock,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "owner" | "manager" | "analyst";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["owner", "manager", "analyst"] },
  { title: "Transactions", url: "/transactions", icon: Receipt, roles: ["owner", "manager"] },
  { title: "Forecasting", url: "/forecasting", icon: TrendingUp, roles: ["owner", "analyst"] },
  { title: "Products", url: "/products", icon: ShoppingBag, roles: ["owner", "manager", "analyst"] },
  { title: "Anomalies", url: "/anomalies", icon: AlertTriangle, roles: ["owner", "analyst"] },
  { title: "Pricing", url: "/pricing", icon: DollarSign, roles: ["owner", "manager", "analyst"] },
  { title: "AI Advisor", url: "/chat", icon: MessageSquare, roles: ["owner", "manager", "analyst"] },
  { title: "Profit Simulator", url: "/simulate", icon: Wand2, roles: ["owner", "analyst"] },
  { title: "AI Insights", url: "/insights", icon: Lightbulb, roles: ["owner", "manager", "analyst"] },
  { title: "Tutorials", url: "/tutorials", icon: PlayCircle, roles: ["owner", "manager", "analyst"] },
  { title: "Business Owners", url: "/business-owners", icon: Briefcase, roles: ["analyst", "owner"] },
  { title: "Manage Tutorials", url: "/analyst-tutorials", icon: Upload, roles: ["analyst"] },
  { title: "Page Access", url: "/analyst-visibility", icon: Lock, roles: ["analyst"] },
];

export const roleLabels: Record<UserRole, string> = {
  owner: "Business Owner",
  manager: "Shop Manager",
  analyst: "Financial Analyst",
};
