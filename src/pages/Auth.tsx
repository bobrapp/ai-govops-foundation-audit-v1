import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Mail, Sparkles } from "lucide-react";

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [busy, setBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => { if (user) nav(next); }, [user, nav, next]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signIn(String(fd.get("email")), String(fd.get("password")));
    setBusy(false);
    if (error) toast.error(error); else { toast.success("welcome back"); nav(next); }
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signUp(
      String(fd.get("email")),
      String(fd.get("password")),
      String(fd.get("display_name")),
      String(fd.get("organization")),
    );
    setBusy(false);
    if (error) toast.error(error); else { toast.success("account created"); nav(next); }
  };

  const onMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("magic_email"));
    if (!email) return;
    setMagicBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setMagicBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Magic link sent — check your email");
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : "Google sign-in failed");
      setGoogleBusy(false);
      return;
    }
    if (result.redirected) return;
    nav(next);
  };

  const onDemo = async () => {
    setDemoBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setDemoBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demo session started — your data is throwaway");
    nav(next);
  };

  return (
    <div className="min-h-screen bg-hero grid place-items-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card-grad p-6 shadow-elev">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">AIGovOps Console</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">sign in to review</div>
          </div>
        </div>

        {/* Quick / credential-less options */}
        <div className="space-y-2 mb-4">
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={googleBusy}>
            {googleBusy ? "…" : "Continue with Google"}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onDemo} disabled={demoBusy}>
            <Sparkles className="h-4 w-4 mr-2" />
            {demoBusy ? "…" : "Try as demo user (no signup)"}
          </Button>
        </div>

        <div className="flex items-center gap-3 my-4">
          <Separator className="flex-1" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Tabs defaultValue="magic">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="magic">Magic link</TabsTrigger>
            <TabsTrigger value="signin">Password</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="magic">
            <form onSubmit={onMagicLink} className="space-y-3 mt-4">
              <div><Label>Email</Label><Input name="magic_email" type="email" required autoComplete="email" /></div>
              <Button type="submit" className="w-full" disabled={magicBusy}>
                <Mail className="h-4 w-4 mr-2" />
                {magicBusy ? "Sending…" : "Email me a sign-in link"}
              </Button>
              <p className="text-[11px] text-muted-foreground">No password — we'll email you a one-click link.</p>
            </form>
          </TabsContent>
          <TabsContent value="signin">
            <form onSubmit={onSignIn} className="space-y-3 mt-4">
              <div><Label>Email</Label><Input name="email" type="email" required autoComplete="email" /></div>
              <div><Label>Password</Label><Input name="password" type="password" required autoComplete="current-password" /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Sign in"}</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={onSignUp} className="space-y-3 mt-4">
              <div><Label>Display name</Label><Input name="display_name" required maxLength={80} /></div>
              <div><Label>Organization</Label><Input name="organization" maxLength={120} /></div>
              <div><Label>Email</Label><Input name="email" type="email" required autoComplete="email" /></div>
              <div><Label>Password</Label><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "Create account"}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
