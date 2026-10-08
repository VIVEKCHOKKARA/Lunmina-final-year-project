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
import { toast } from "@/hooks/use-toast";
import { forgotPassword, resetPassword } from "@/lib/api";
import { KeyRound, Mail, ArrowLeft, Loader2 } from "lucide-react";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(defaultEmail);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await forgotPassword(email);
      setResetCode("");
      setStep("reset");
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit verification code has been sent to ${email}.`,
      });
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message || "Could not find account for this email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword) return;

    setLoading(true);
    try {
      await resetPassword({ email, resetCode, newPassword });
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now sign in.",
      });
      // Reset state and close modal
      setStep("request");
      setResetCode("");
      setNewPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Reset Failed",
        description: err.message || "Failed to reset password. Please verify your code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="p-2.5 rounded-full bg-primary/10 text-primary w-fit mb-2">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold font-display">
            {step === "request" ? "Reset your password" : "Enter verification code"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === "request"
              ? "Enter your account email address and we will send a verification code to your inbox."
              : `Check your email (${email}) for the 6-digit code and choose a new password.`}
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <form onSubmit={handleRequestCode} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Account Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2 font-bold">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Code
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-foreground text-xs leading-relaxed flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Check your email inbox</p>
                <p className="text-muted-foreground mt-0.5">
                  We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>. Please enter it below.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-code">6-Digit Verification Code</Label>
              <Input
                id="reset-code"
                placeholder="Enter 6-digit code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="font-mono text-center text-lg tracking-widest"
                maxLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("request")}
                className="gap-1 text-xs text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} size="sm" className="font-bold">
                  {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Save New Password
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
