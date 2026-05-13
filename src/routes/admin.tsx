import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/packages";
import { ShoppingBag, Clock, CheckCircle2, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminHome });

function AdminHome() {
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, revenue: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      const list = data ?? [];
      setRecent(list.slice(0, 8));
      setStats({
        total: list.length,
        pending: list.filter((o) => o.status === "pending").length,
        delivered: list.filter((o) => o.status === "delivered").length,
        revenue: list.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.package_price), 0),
      });
    });
  }, []);

  return (
    <DashboardShell admin>
      <h1 className="mb-6 text-2xl font-semibold">Admin overview</h1>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ShoppingBag} label="Total orders" value={stats.total} />
        <Stat icon={Clock} label="Pending" value={stats.pending} />
        <Stat icon={CheckCircle2} label="Delivered" value={stats.delivered} />
        <Stat icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(2)}`} />
      </div>
      <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
        <h2 className="mb-4 text-lg font-semibold">Recent orders</h2>
        <div className="divide-y divide-border/60">
          {recent.map((o) => (
            <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="flex items-center justify-between py-3 text-sm hover:bg-muted/20 -mx-2 px-2 rounded">
              <div>
                <div className="font-medium">{o.package_name}</div>
                <div className="text-xs text-muted-foreground">{o.roblox_username} · {new Date(o.created_at).toLocaleString()}</div>
              </div>
              <Badge variant="outline" className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge>
            </Link>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="border-border/60 bg-gradient-card p-5 shadow-card-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}