import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Zap, Loader2, Briefcase, Store, LineChart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { roleLabels, type UserRole } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const roleOptions: { role: UserRole; icon: typeof Briefcase; blurb: string }[] = [
    { role: "owner", icon: Briefcase, blurb: "Full access to every dashboard" },
    { role: "manager", icon: Store, blurb: "Day-to-day shop operations" },
    { role: "analyst", icon: LineChart, blurb: "Pricing approval & insights" },
];

export default function Login() {
    const { user, loading, login, register } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<"login" | "signup">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("owner");
    const [submitting, setSubmitting] = useState(false);

    // Already signed in → bounce to the dashboard.
    if (!loading && user) return <Navigate to="/" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const signedIn =
                mode === "login"
                    ? await login(email, password)
                    : await register({ name, email, password, role });
            toast({
                title: `Welcome, ${signedIn.name}`,
                description: `Signed in as ${roleLabels[signedIn.role]}.`,
            });
            navigate("/", { replace: true });
        } catch (err) {
            toast({
                title: mode === "login" ? "Login failed" : "Sign up failed",
                description: err instanceof Error ? err.message : "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Premium day/night toggle — fixed top-right corner */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            <div className="glow-card w-full max-w-md p-8">
                {/* Brand */}
                <div className="flex items-center gap-2 justify-center mb-6">
                    <Zap className="h-7 w-7 text-primary" />
                    <span className="font-display text-2xl font-bold tracking-tight">Lumina</span>
                </div>
                <h1 className="font-display text-xl font-semibold text-center text-foreground">
                    {mode === "login" ? "Sign in to Lumina" : "Create your account"}
                </h1>
                <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
                    {mode === "login"
                        ? "Owners, shop managers and financial analysts"
                        : "Choose the role that matches your responsibilities"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <Label htmlFor="name">Full name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Jane Doe"
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@business.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            required
                        />
                    </div>

                    {mode === "signup" && (
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {roleOptions.map(({ role: r, icon: Icon, blurb }) => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setRole(r)}
                                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${role === r
                                                ? "border-primary bg-primary/10"
                                                : "border-border hover:bg-accent/50"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 text-primary shrink-0" />
                                        <span>
                                            <span className="block text-sm font-medium text-foreground">
                                                {roleLabels[r]}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">{blurb}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === "login" ? "Sign in" : "Create account"}
                    </Button>
                </form>

                <p className="text-sm text-center text-muted-foreground mt-6">
                    {mode === "login" ? "New here?" : "Already have an account?"}{" "}
                    <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    >
                        {mode === "login" ? "Create an account" : "Sign in"}
                    </button>
                </p>

                {mode === "login" && (
                    <div className="mt-6 rounded-lg bg-accent/40 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-2">Quick Demo Login (Click to fill)</p>
                        <div className="space-y-1.5">
                            <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/70 flex items-center justify-between text-foreground transition-colors border border-border/40"
                                onClick={() => {
                                    setEmail("owner@profitnavigator.com");
                                    setPassword("owner123");
                                }}
                            >
                                <span className="font-medium">Business Owner</span>
                                <span className="text-muted-foreground text-[11px]">owner@profitnavigator.com</span>
                            </button>
                            <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/70 flex items-center justify-between text-foreground transition-colors border border-border/40"
                                onClick={() => {
                                    setEmail("manager@profitnavigator.com");
                                    setPassword("manager123");
                                }}
                            >
                                <span className="font-medium">Shop Manager</span>
                                <span className="text-muted-foreground text-[11px]">manager@profitnavigator.com</span>
                            </button>
                            <button
                                type="button"
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/70 flex items-center justify-between text-foreground transition-colors border border-border/40"
                                onClick={() => {
                                    setEmail("analyst@profitnavigator.com");
                                    setPassword("analyst123");
                                }}
                            >
                                <span className="font-medium">Financial Analyst</span>
                                <span className="text-muted-foreground text-[11px]">analyst@profitnavigator.com</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
