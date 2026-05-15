import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/packages";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/orders/$id")({ component: OrderDetail });

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = () => { supabase.from("orders").select("*").eq("id", id).maybeSingle().then(({data}) => { setOrder(data); setLoading(false); }); };
  useEffect(load, [id]);
  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (error) { setUploading(false); return toast.error(error.message); }
    const { error: e2 } = await supabase.from("orders").update({ payment_proof: path }).eq("id", id);
    setUploading(false);
    if (e2) return toast.error(e2.message);
    toast.success("Payment proof uploaded"); load();
  };
  if (loading) return <DashboardShell><Loader2 className="h-6 w-6 animate-spin text-primary" /></DashboardShell>;
  if (!order) return <DashboardShell><p>Order not found.</p></DashboardShell>;
  return (
    <DashboardShell>
      <Button variant="ghost" size="sm" asChild className="mb-4"><Link to="/dashboard/orders"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Order #{order.id.slice(0,8)}</h1>
          <p className="text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p></div>
        <Badge variant="outline" className={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Order details</h2>
          <F l="Package" v={`${order.package_name} — $${Number(order.package_price).toFixed(2)}`} />
          <F l="Roblox username" v={order.roblox_username} />
          {order.gamepass_link && <F l="Gamepass link" v={<a className="text-primary hover:underline break-all" href={order.gamepass_link} target="_blank" rel="noreferrer">{order.gamepass_link}</a>} />}
          <F l="Payment method" v={order.payment_method.toUpperCase()} />
          {order.note && <F l="Your note" v={order.note} />}
          {order.admin_note && <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"><div className="text-xs uppercase tracking-wider text-primary mb-1">Message from support</div>{order.admin_note}</div>}
        </Card>
        <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft space-y-4">
          <h2 className="text-lg font-semibold">Payment proof</h2>
          {order.payment_proof ? <div className="text-sm text-muted-foreground break-all">Uploaded ✓<br/><span className="text-xs">{order.payment_proof}</span></div> : <p className="text-sm text-muted-foreground">No proof uploaded yet.</p>}
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full" variant="outline"><Upload className="mr-1.5 h-4 w-4" /> {uploading ? "Uploading…" : order.payment_proof ? "Replace proof" : "Upload proof"}</Button>
        </Card>
      </div>
    </DashboardShell>
  );
}
function F({ l, v }: { l: string; v: React.ReactNode }) {
  return <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div><div className="mt-1 text-sm">{v}</div></div>;
}
