import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Zap,
  LayoutDashboard,
  ShoppingBag,
  Plus,
  ShieldCheck,
  LogOut,
  Home,
  Loader2,
} from "lucide-react";

interface Item { to: string; icon: React.ComponentType<{ className?: string }>; label: string }

export function DashboardShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
    if (!loading && admin && user && !isAdmin) nav({ to: "/dashboard" });
  }, [loading, user, isAdmin, admin, nav]);

  if (loading || !user || (admin && !isAdmin)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const userItems: Item[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { to: "/dashboard/orders", icon: ShoppingBag, label: "My Orders" },
    { to: "/new-order", icon: Plus, label: "New Order" },
  ];
  const adminItems: Item[] = [
    { to: "/admin", icon: LayoutDashboard, label: "Overview" },
    { to: "/admin/orders", icon: ShoppingBag, label: "All Orders" },
  ];
  const items = admin ? adminItems : userItems;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-sidebar/80 p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </span>
          InstantBlox
        </Link>
        <div className="mb-2 px-2 text-xs uppercase tracking-wider text-muted-foreground">
          {admin ? "Admin" : "Account"}
        </div>
        <nav className="space-y-1">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/dashboard" && it.to !== "/admin" && path.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 pt-4">
          {!admin && isAdmin && (
            <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
              <ShieldCheck className="h-4 w-4" /> Admin Panel
            </Link>
          )}
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
            <Home className="h-4 w-4" /> Back to site
          </Link>
          <button onClick={() => signOut().then(() => nav({ to: "/" }))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <div className="px-3 pt-3 text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Zap className="h-4 w-4 text-primary" /> InstantBlox
          </Link>
          <Button size="sm" variant="outline" onClick={() => signOut().then(() => nav({ to: "/" }))}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}