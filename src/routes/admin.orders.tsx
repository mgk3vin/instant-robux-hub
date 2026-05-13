import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/packages";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  useEffect(() => { supabase.from("orders").select("*").order("created_at",{ascending:false}).then(({data})=>setOrders(data ?? [])); }, []);
  const filtered = orders.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (q && !`${o.id} ${o.roblox_username} ${o.package_name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <DashboardShell admin>
      <h1 className="mb-6 text-2xl font-semibold">All orders</h1>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by id, username, package…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k,v])=> <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="border-border/60 bg-gradient-card p-0 shadow-card-soft overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Roblox user</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">{filtered.map((o)=>(
            <tr key={o.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-mono text-xs"><Link to="/admin/orders/$id" params={{id:o.id}} className="text-primary hover:underline">#{o.id.slice(0,8)}</Link></td>
              <td className="px-4 py-3">{o.roblox_username}</td>
              <td className="px-4 py-3">{o.package_name}</td>
              <td className="px-4 py-3 uppercase text-xs text-muted-foreground">{o.payment_method}</td>
              <td className="px-4 py-3"><Badge variant="outline" className={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
            </tr>))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No orders match.</td></tr>}
          </tbody>
        </table></div>
      </Card>
    </DashboardShell>
  );
}
