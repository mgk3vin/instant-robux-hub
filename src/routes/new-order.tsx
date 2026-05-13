import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PACKAGES } from "@/lib/packages";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Bitcoin, CreditCard, Wallet, CheckCircle2, Copy, BookOpen } from "lucide-react";

export const Route = createFileRoute("/new-order")({
  validateSearch: (s: Record<string, unknown>) => ({ pkg: typeof s.pkg === "string" ? s.pkg : undefined }),
  component: NewOrder,
});

const PAYMENTS = [
  { id: "crypto" as const, label: "Crypto", icon: Bitcoin, address: "bc1q9instantbloxdemowalletaddressxyz", note: "Send the exact amount in BTC. Include order ID in memo." },
  { id: "paypal" as const, label: "PayPal", icon: Wallet, address: "payments@instantblox.demo", note: "Send as Friends & Family. Include order ID in note." },
  { id: "card" as const, label: "Card", icon: CreditCard, address: "Manual link sent after order", note: "We'll send a secure invoice link to your email." },
];

const schema = z.object({
  roblox_username: z.string().trim().min(3).max(40),
  gamepass_link: z.string().trim().url().max(500),
  note: z.string().max(500).optional(),
});

function NewOrder() {
  const { pkg } = Route.useSearch();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [packageId, setPackageId] = useState<string>(pkg ?? "p800");
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "paypal" | "card">("crypto");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [gamepassLink, setGamepassLink] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const selectedPkg = PACKAGES.find((p) => p.id === packageId)!;
  const selectedPay = PAYMENTS.find((p) => p.id === paymentMethod)!;

  const submit = async () => {
    const parsed = schema.safeParse({ roblox_username: robloxUsername, gamepass_link: gamepassLink, note });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        roblox_username: parsed.data.roblox_username,
        gamepass_link: parsed.data.gamepass_link,
        package_name: `${selectedPkg.robux} Robux (${selectedPkg.name})`,
        package_price: selectedPkg.price,
        payment_method: paymentMethod,
        note: parsed.data.note || null,
        status: "pending",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setCreatedId(data.id);
    setStep(5);
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {createdId ? (
          <Card className="border-border/60 bg-gradient-card p-10 text-center shadow-glow">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <h1 className="mt-4 text-3xl font-bold">Order created!</h1>
            <p className="mt-2 text-muted-foreground">Your order ID is</p>
            <div className="mx-auto mt-2 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-4 py-2 font-mono text-sm">
              #{createdId.slice(0, 8)} <button onClick={() => copy(createdId)}><Copy className="h-3.5 w-3.5" /></button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Complete payment using the instructions shown earlier and upload your proof.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => nav({ to: "/dashboard/orders/$id", params: { id: createdId } })}>View order</Button>
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => nav({ to: "/dashboard" })}>Go to dashboard</Button>
            </div>
          </Card>
        ) : (
          <>
            <Stepper step={step} />
            {step === 1 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <h2 className="text-xl font-semibold">Select a package</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {PACKAGES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPackageId(p.id)}
                      className={`relative rounded-xl border p-4 text-left transition-all ${packageId === p.id ? "border-primary bg-primary/5 shadow-glow" : "border-border/60 hover:border-primary/40"}`}
                    >
                      {p.popular && <Badge className="absolute right-3 top-3 bg-gradient-primary text-primary-foreground">Popular</Badge>}
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.name}</div>
                      <div className="mt-1 text-2xl font-bold text-gradient">{p.robux.toLocaleString()} Robux</div>
                      <div className="mt-1 text-lg font-semibold">${p.price}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setStep(2)} className="bg-gradient-primary text-primary-foreground">Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <h2 className="text-xl font-semibold">Choose payment method</h2>
                <p className="mt-1 text-sm text-muted-foreground">All payments are handled manually. No payment data is processed on this site.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {PAYMENTS.map((m) => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-all ${paymentMethod === m.id ? "border-primary bg-primary/5 shadow-glow" : "border-border/60 hover:border-primary/40"}`}>
                      <m.icon className="h-6 w-6 text-primary" />
                      <span className="font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-4 text-sm">
                  <div className="font-medium">{selectedPay.label} instructions</div>
                  <div className="mt-2 flex items-center gap-2 font-mono text-xs">
                    <span className="break-all">{selectedPay.address}</span>
                    <button onClick={() => copy(selectedPay.address)}><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{selectedPay.note}</p>
                </div>
                <div className="mt-6 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={() => setStep(3)} className="bg-gradient-primary text-primary-foreground">Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <h2 className="text-xl font-semibold">Roblox details</h2>
                <div className="mt-5 grid gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ru">Roblox username</Label>
                    <Input id="ru" value={robloxUsername} onChange={(e) => setRobloxUsername(e.target.value)} placeholder="e.g. CoolGamer92" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gp">Gamepass link</Label>
                    <Input id="gp" value={gamepassLink} onChange={(e) => setGamepassLink(e.target.value)} placeholder="https://www.roblox.com/game-pass/…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nt">Note (optional)</Label>
                    <Textarea id="nt" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything we should know?" />
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={() => setStep(4)} className="bg-gradient-primary text-primary-foreground">Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </div>
              </Card>
            )}

            {step === 4 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">How to create a Roblox gamepass</h2></div>
                <ol className="mt-5 space-y-3">
                  {[
                    "Open Roblox and go to Create → My Creations → Experiences.",
                    "Pick any of your experiences (or create a free blank one).",
                    "Click the '...' menu → Configure Game → Monetization → Passes.",
                    "Click 'Create a Pass', upload an icon and name it.",
                    `Set the price to match this exact amount: $${selectedPkg.price} ≈ ${selectedPkg.robux} Robux.`,
                    "Copy the gamepass URL — that's the link you pasted above.",
                  ].map((s, i) => (
                    <li key={i} className="flex gap-3 rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={submit} disabled={submitting} className="bg-gradient-primary text-primary-foreground">{submitting ? "Submitting…" : "Submit order"}</Button>
                </div>
              </Card>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Package", "Payment", "Roblox", "Tutorial"];
  return (
    <div className="mb-8 flex items-center gap-2 sm:gap-4">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step >= n;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</div>
            <div className={`hidden text-xs sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}