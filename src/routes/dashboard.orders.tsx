import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/packages";
import { Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/dashboard/orders")({ component: OrdersList });

function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setOrders(data ?? []); setLoading(false);
    });
  }, []);
  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My orders</h1>
        <Button asChild className="bg-gradient-primary text-primary-foreground">
          <Link to="/new-order"><Plus className="mr-1.5 h-4 w-4" /> New order</Link>
        </Button>
      </div>
      <Card className="border-border/60 bg-gradient-card p-0 shadow-card-soft overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />)}</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" /><p className="mt-3 text-sm text-muted-foreground">No orders yet</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">{orders.map((o) => (
              <tr key={o.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs"><Link to="/dashboard/orders/$id" params={{id:o.id}} className="text-primary hover:underline">#{o.id.slice(0,8)}</Link></td>
                <td className="px-4 py-3">{o.package_name}</td>
                <td className="px-4 py-3">${Number(o.package_price).toFixed(2)}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </DashboardShell>
  );
}
