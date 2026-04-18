import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav("/dashboard"); }, [user, nav]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await signIn(String(fd.get("email")), String(fd.get("password")));
    setBusy(false);
    if (error) toast.error(error); else { toast.success("welcome back"); nav("/dashboard"); }
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
    if (error) toast.error(error); else { toast.success("account created"); nav("/dashboard"); }
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
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
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
