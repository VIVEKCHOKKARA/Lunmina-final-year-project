import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { roleLabels, type UserRole } from "@/lib/navigation";
import { Loader2, ArrowRight } from "lucide-react";

interface GoogleSignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedRole: UserRole;
}

const DEMO_GOOGLE_ACCOUNTS = [
  {
    name: "Vivek Chokkara",
    email: "vivek.chokkara@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Raju Business Owner",
    email: "raju.owner@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  },
  {
    name: "Alex Store Manager",
    email: "alex.manager@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  },
];

export function GoogleSignInModal({
  open,
  onOpenChange,
  onSuccess,
  selectedRole,
}: GoogleSignInModalProps) {
  const { loginWithGoogle } = useAuth();
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectAccount = async (account: { name: string; email: string; avatarUrl?: string }) => {
    setSubmitting(true);
    try {
      const user = await loginWithGoogle({
        email: account.email,
        name: account.name,
        role: selectedRole,
        avatarUrl: account.avatarUrl,
      });
      toast({
        title: "Google Authentication Successful",
        description: `Signed in as ${user.name} (${roleLabels[user.role]}).`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Google Sign In Failed",
        description: err.message || "Failed to authenticate with Google.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    await handleSelectAccount({
      name: customName || customEmail.split("@")[0],
      email: customEmail,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader className="items-center text-center">
          <div className="p-3 rounded-full bg-accent/60 mb-2 border border-border">
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>
          <DialogTitle className="text-xl font-bold font-display">
            Sign in with Google
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose a Google Account to sign in to Lumina as <strong className="text-foreground">{roleLabels[selectedRole]}</strong>
          </DialogDescription>
        </DialogHeader>

        {!useCustom ? (
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              {DEMO_GOOGLE_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  disabled={submitting}
                  onClick={() => handleSelectAccount(account)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={account.avatarUrl} alt={account.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {account.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {account.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                  </div>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Use a different Google Account
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="google-email">Google Email</Label>
              <Input
                id="google-email"
                type="email"
                placeholder="your.email@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-name">Name (Optional)</Label>
              <Input
                id="google-name"
                placeholder="Your Full Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUseCustom(false)}
                className="text-xs text-muted-foreground"
              >
                Back to accounts
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="font-bold">
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Continue with Google
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
