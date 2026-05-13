import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/packages";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders/$id")({ component: AdminOrderDetail });

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = () => {
    supabase.from("orders").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
      setOrder(data);
      if (data) {
        setAdminNote(data.admin_note ?? ""); setStatus(data.status);
        if (data.payment_proof) {
          const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(data.payment_proof, 3600);
          setProofUrl(signed?.signedUrl ?? null);
        }
      }
    });
  };
  useEffect(load, [id]);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("orders").update({ status: status as any, admin_note: adminNote || null }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Order updated"); load();
  };
  if (!order) return <DashboardShell admin><Loader2 className="h-6 w-6 animate-spin text-primary" /></DashboardShell>;
  return (
    <DashboardShell admin>
      <Button variant="ghost" size="sm" asChild className="mb-4"><Link to="/admin/orders"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Order #{order.id.slice(0,8)}</h1>
          <p className="text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p></div>
        <Badge variant="outline" className={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">Customer details</h2>
          <KV l="User ID" v={<span className="font-mono text-xs">{order.user_id}</span>} />
          <KV l="Roblox username" v={order.roblox_username} />
          <KV l="Gamepass" v={<a className="text-primary hover:underline break-all" href={order.gamepass_link} target="_blank" rel="noreferrer">{order.gamepass_link}</a>} />
          <KV l="Package" v={`${order.package_name} — $${Number(order.package_price).toFixed(2)}`} />
          <KV l="Payment method" v={order.payment_method.toUpperCase()} />
          {order.note && <KV l="User note" v={order.note} />}
        </Card>
        <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft space-y-4">
          <h2 className="text-lg font-semibold">Manage order</h2>
          <div className="space-y-1.5"><label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_LABEL).map(([k,v])=> <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><label className="text-xs uppercase tracking-wider text-muted-foreground">Internal / customer note</label>
            <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={4} /></div>
          <Button onClick={save} disabled={saving} className="w-full bg-gradient-primary text-primary-foreground">{saving ? "Saving…" : "Save changes"}</Button>
        </Card>
      </div>
      <Card className="mt-6 border-border/60 bg-gradient-card p-6 shadow-card-soft">
        <h2 className="text-lg font-semibold">Payment proof</h2>
        {proofUrl ? <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
          <img src={proofUrl} alt="Payment proof" className="max-h-[400px] rounded-lg border border-border/60" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          <div className="mt-2 text-sm text-primary hover:underline">Open in new tab</div>
        </a> : <p className="mt-2 text-sm text-muted-foreground">No proof uploaded yet.</p>}
      </Card>
    </DashboardShell>
  );
}
function KV({ l, v }: { l: string; v: React.ReactNode }) {
  return <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div><div className="mt-0.5 text-sm">{v}</div></div>;
}
