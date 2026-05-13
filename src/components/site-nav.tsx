import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";

export function SiteNav() {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-lg tracking-tight">InstantBlox</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" hash="packages" className="hover:text-foreground transition-colors">Packages</Link>
          <Link to="/" hash="how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          <Link to="/" hash="faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => nav({ to: "/admin" })}>
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut().then(() => nav({ to: "/" }))}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" asChild>
                <Link to="/new-order">Create Order</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}