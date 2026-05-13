import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/packages";
import { Plus, ShoppingBag, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: DashboardHome });

interface Order { id: string; package_name: string; package_price: number; status: string; created_at: string }

function DashboardHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id, package_name, package_price, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
  }, [user]);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground">
          <Link to="/new-order"><Plus className="mr-1.5 h-4 w-4" /> New order</Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={ShoppingBag} label="Recent orders" value={stats.total} />
        <StatCard icon={Clock} label="Pending" value={stats.pending} />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} />
      </div>

      <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/orders">View all</Link>
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No orders yet</p>
            <Button className="mt-4 bg-gradient-primary text-primary-foreground" asChild>
              <Link to="/new-order">Create your first order</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {orders.map((o) => (
              <Link
                key={o.id}
                to="/dashboard/orders/$id"
                params={{ id: o.id }}
                className="flex items-center justify-between py-3 text-sm hover:bg-muted/20 -mx-2 px-2 rounded"
              >
                <div>
                  <div className="font-medium">{o.package_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${Number(o.package_price).toFixed(2)}</span>
                  <Badge variant="outline" className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="border-border/60 bg-gradient-card p-5 shadow-card-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}