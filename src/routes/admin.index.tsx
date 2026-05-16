import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/packages";
import {
  ShoppingBag, Clock, CheckCircle2, DollarSign, Eye, Search, Copy,
  ExternalLink, ShieldCheck, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

type Order = any;

function AdminHome() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const load = () =>
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));

  useEffect(() => { load(); }, []);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    revenue: orders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + Number(o.package_price), 0),
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (q && !`${o.id} ${o.roblox_username} ${o.package_name}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">All orders</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Roblox user</th>
                <th className="px-3 py-3">Package</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20">
                  <td className="px-3 py-3 font-mono text-xs text-primary">#{o.id.slice(0, 8)}</td>
                  <td className="px-3 py-3">{o.roblox_username}</td>
                  <td className="px-3 py-3">{o.package_name}</td>
                  <td className="px-3 py-3 uppercase text-xs text-muted-foreground">{o.payment_method}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={STATUS_COLOR[o.status]}>
                      {STATUS_LABEL[o.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelected(o)}
                      className="text-xs"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Details
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <OrderDetailsDialog
        order={selected}
        onClose={() => setSelected(null)}
        onSaved={() => { load(); }}
      />
    </DashboardShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
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

interface RobloxInfo {
  id: number;
  name: string;
  displayName: string;
  avatar: string | null;
}

function OrderDetailsDialog({
  order, onClose, onSaved,
}: { order: Order | null; onClose: () => void; onSaved: () => void }) {
  const [roblox, setRoblox] = useState<RobloxInfo | null>(null);
  const [loadingRoblox, setLoadingRoblox] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [saving, setSaving] = useState(false);
  const [revealKey, setRevealKey] = useState(false);

  useEffect(() => {
    if (!order) return;
    setAdminNote(order.admin_note ?? "");
    setStatus(order.status);
    setRoblox(null);
    setProofUrl(null);
    setRevealKey(false);

    // Roblox lookup
    setLoadingRoblox(true);
    (async () => {
      try {
        const res = await fetch("https://users.roblox.com/v1/usernames/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [order.roblox_username], excludeBannedUsers: false }),
        });
        const j = await res.json();
        const user = j?.data?.[0];
        if (!user) { setRoblox(null); return; }
        let avatar: string | null = null;
        try {
          const aRes = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`,
          );
          const aJ = await aRes.json();
          avatar = aJ?.data?.[0]?.imageUrl ?? null;
        } catch { /* ignore */ }
        setRoblox({ id: user.id, name: user.name, displayName: user.displayName, avatar });
      } catch {
        setRoblox(null);
      } finally {
        setLoadingRoblox(false);
      }
    })();

    // Payment proof signed URL
    if (order.payment_proof) {
      supabase.storage
        .from("payment-proofs")
        .createSignedUrl(order.payment_proof, 3600)
        .then(({ data }) => setProofUrl(data?.signedUrl ?? null));
    }
  }, [order]);

  const copy = (v: string, l: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${l} copied`);
  };

  const save = async () => {
    if (!order) return;
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: status as any, admin_note: adminNote || null })
      .eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border/60 bg-card">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Order <span className="font-mono text-sm text-primary">#{order.id.slice(0, 8)}</span>
                <Badge variant="outline" className={STATUS_COLOR[order.status]}>
                  {STATUS_LABEL[order.status]}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Placed {new Date(order.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {/* Roblox account */}
            <Card className="border-border/60 bg-background/40 p-4">
              <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Roblox account
              </div>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 border border-border/60">
                  {roblox?.avatar && <AvatarImage src={roblox.avatar} alt={roblox.name} />}
                  <AvatarFallback>{order.roblox_username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1.5">
                  {loadingRoblox ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Roblox profile…
                    </div>
                  ) : roblox ? (
                    <>
                      <div className="text-base font-semibold">
                        {roblox.displayName}{" "}
                        <span className="text-sm font-normal text-muted-foreground">@{roblox.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          onClick={() => copy(String(roblox.id), "Roblox ID")}
                          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono hover:bg-muted/50"
                        >
                          ID: {roblox.id} <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://www.roblox.com/users/${roblox.id}/profile`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-primary hover:bg-primary/10"
                        >
                          Profile <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Could not load Roblox profile for{" "}
                      <span className="font-mono">{order.roblox_username}</span>.
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* API key — blurred until hover */}
            <Card className="border-border/60 bg-background/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Roblox API key
                </div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400">
                  Securely encrypted
                </span>
              </div>
              {order.roblox_api_key ? (
                <button
                  type="button"
                  onMouseEnter={() => setRevealKey(true)}
                  onMouseLeave={() => setRevealKey(false)}
                  onFocus={() => setRevealKey(true)}
                  onBlur={() => setRevealKey(false)}
                  onClick={() => copy(order.roblox_api_key, "API key")}
                  title="Hover to reveal · Click to copy"
                  className="group relative block w-full overflow-hidden rounded-md border border-border/60 bg-muted/30 p-3 text-left transition hover:border-primary/50"
                >
                  <code
                    className={`block break-all font-mono text-xs transition-all duration-200 ${
                      revealKey ? "blur-0" : "blur-sm select-none"
                    }`}
                  >
                    {order.roblox_api_key}
                  </code>
                  <div className="pointer-events-none mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{revealKey ? "Click to copy" : "Hover to reveal"}</span>
                    <Copy className="h-3 w-3" />
                  </div>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">No API key saved on this order.</p>
              )}
            </Card>

            {/* Order info */}
            <Card className="border-border/60 bg-background/40 p-4">
              <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Order information
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <KV l="Package" v={`${order.package_name} — $${Number(order.package_price).toFixed(2)}`} />
                <KV l="Payment method" v={order.payment_method?.toUpperCase()} />
                {order.transaction_id && (
                  <KV
                    l="Transaction ID"
                    v={
                      <button
                        onClick={() => copy(order.transaction_id, "Transaction ID")}
                        className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                      >
                        {order.transaction_id} <Copy className="h-3 w-3" />
                      </button>
                    }
                  />
                )}
                {order.gamepass_link && (
                  <KV
                    l="Gamepass"
                    v={
                      <a
                        href={order.gamepass_link}
                        target="_blank" rel="noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {order.gamepass_link}
                      </a>
                    }
                  />
                )}
                <KV l="User ID" v={<span className="font-mono text-xs break-all">{order.user_id}</span>} />
                <KV l="Created" v={new Date(order.created_at).toLocaleString()} />
                {order.payment_submitted_at && (
                  <KV l="Payment submitted" v={new Date(order.payment_submitted_at).toLocaleString()} />
                )}
                {order.note && <KV l="User note" v={order.note} />}
              </div>

              {proofUrl && (
                <div className="mt-4">
                  <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Payment proof
                  </div>
                  <a href={proofUrl} target="_blank" rel="noreferrer">
                    <img
                      src={proofUrl}
                      alt="Payment proof"
                      className="max-h-[260px] rounded-lg border border-border/60"
                    />
                  </a>
                </div>
              )}
            </Card>

            {/* Manage */}
            <Card className="border-border/60 bg-background/40 p-4 space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Manage order</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Internal / customer note</label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <Button
                onClick={save}
                disabled={saving}
                className="w-full bg-gradient-primary text-primary-foreground"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KV({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
      <div className="mt-0.5 text-sm">{v}</div>
    </div>
  );
}
