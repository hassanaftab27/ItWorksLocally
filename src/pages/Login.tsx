import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { publicOrgLogoUrl } from "@/features/organization/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenLogo, setBrokenLogo] = useState<string | null>(null);
  const orgLogo = publicOrgLogoUrl();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            {orgLogo !== brokenLogo && (
              <img
                src={orgLogo}
                alt="Company"
                className="size-8 shrink-0 rounded object-contain"
                onError={() => setBrokenLogo(orgLogo)}
              />
            )}
            <img src="/logo.svg?v=2" alt="" className="size-8 shrink-0" />
            <h1 className="text-2xl font-bold">ItWorksLocally</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in with a magic link sent to your email.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md border bg-card p-4 text-sm">
            Check <span className="font-medium">{email}</span> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={sending || !email}>
              {sending ? "Sending..." : "Send magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
