import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password,
      options: { emailRedirectTo: window.location.origin + "/dashboard" } });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email to verify.");
    nav({ to: "/login" });
  };
  return (
    <AuthShell title="Create your account" subtitle="Start ordering Robux in minutes"
      footer={<>Already registered? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters</p></div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
          {loading ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthShell>
  );
}
