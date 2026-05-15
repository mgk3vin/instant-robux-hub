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
import { lookupRobloxUser, validateRobloxStatus } from "@/lib/roblox.functions";
import type { RobloxUserLookup } from "@/lib/roblox.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Bitcoin, CreditCard, Wallet, CheckCircle2,
  Copy, KeyRound, ShieldCheck, ExternalLink, RefreshCw, Lock,
  Upload, Info, Sparkles, FileCheck2, UserCheck, Loader2,
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

const paymentSchema = z.object({
  transaction_id: z.string().trim().min(4, "Enter the transaction ID from your payment").max(200),
});

type VerifiedUser = Extract<RobloxUserLookup, { ok: true }>;

function formatAgeRating(ageRating: string) {
  const normalized = ageRating.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const labels: Record<string, string> = {
    AGERATINGMINIMAL: "Minimal",
    MINIMAL: "Minimal",
    AGERATINGALL: "Minimal",
    ALL: "Minimal",
    AGERATING9PLUS: "9+",
    AGERATING13PLUS: "13+",
    AGERATING17PLUS: "17+",
    AGERATINGUNSPECIFIED: "Not exposed by Open Cloud",
    UNSPECIFIED: "Not exposed by Open Cloud",
    QUESTIONNAIREREQUIRED: "Questionnaire required",
  };

  return labels[normalized] ?? ageRating;
}

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

  // Step 3
  const [robloxUsername, setRobloxUsername] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Step 4
  const [apiKey, setApiKey] = useState("");
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValidated, setKeyValidated] = useState(false);
  const [ageRating, setAgeRating] = useState<string | null>(null);
  const [isRatingUnavailable, setIsRatingUnavailable] = useState(false);
  const [visibility, setVisibility] = useState<string | null>(null);
  const [isExperiencePublic, setIsExperiencePublic] = useState(false);
  const [isExperienceReady, setIsExperienceReady] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Step 5
  const [refreshing, setRefreshing] = useState(false);

  // Step 6
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const lookupFn = useServerFn(lookupRobloxUser);
  const validateStatusFn = useServerFn(validateRobloxStatus);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  // Reset key validation if api key changes
  useEffect(() => {
    setKeyValidated(false);
    setAgeRating(null);
    setIsRatingUnavailable(false);
    setVisibility(null);
    setIsExperiencePublic(false);
    setIsExperienceReady(false);
    setMissingRequirements([]);
    setKeyError(null);
  }, [apiKey]);

  // Reset verified user if username changes
  useEffect(() => {
    if (verifiedUser && verifiedUser.username.toLowerCase() !== robloxUsername.trim().toLowerCase()) {
      setVerifiedUser(null);
    }
  }, [robloxUsername, verifiedUser]);

  // Auto-poll status on step 5 until all requirements pass.
  useEffect(() => {
    if (step !== 5 || isExperienceReady || !verifiedUser) return;
    const t = setInterval(() => {
      void refreshStatus(true);
    }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isExperienceReady, verifiedUser]);

  const selectedPkg = PACKAGES.find((p) => p.id === packageId)!;
  const selectedPay = PAYMENTS.find((p) => p.id === paymentMethod)!;
  const missingRequirementLabels: Record<string, string> = {
    "Minimal rating": "Minimal rating",
    "Public visibility": "Public visibility",
  };
  const statusMessage = isExperienceReady
    ? "All requirements are met."
    : missingRequirements.length > 0
      ? `Missing: ${missingRequirements.map((r) => missingRequirementLabels[r] ?? r).join(", ")}.`
      : "Status is being checked.";

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied to clipboard"); };
  const openExternal = (url: string) => {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
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

  const goToUsername = () => {
    const parsed = paymentSchema.safeParse({ transaction_id: transactionId });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setStep(3);
  };

  const lookupUser = async () => {
    const name = robloxUsername.trim();
    if (name.length < 3) {
      setLookupError("Username must be at least 3 characters");
      return;
    }
    setLookingUp(true);
    setLookupError(null);
    try {
      const r = await lookupFn({ data: { username: name } });
      if (r.ok) {
        setVerifiedUser(r);
      } else {
        setVerifiedUser(null);
        setLookupError(r.error);
      }
    } catch {
      setLookupError("Could not look up your Roblox account. Please try again.");
    } finally {
      setLookingUp(false);
    }
  };

  const validateKey = async () => {
    if (!verifiedUser) return;
    if (apiKey.trim().length < 20) {
      const msg = "Please paste a valid Roblox API key.";
      setKeyError(msg);
      toast.error(msg);
      return;
    }
    setValidatingKey(true);
    setKeyError(null);
    try {
      const r = await validateStatusFn({
        data: { apiKey: apiKey.trim(), universeId: verifiedUser.universeId },
      });
      if (r.ok) {
        setKeyValidated(true);
        setAgeRating(r.ageRating);
        setIsRatingUnavailable(r.isRatingUnavailable);
        setVisibility(r.visibility);
        setIsExperiencePublic(r.isPublic);
        setIsExperienceReady(r.isReady);
        setMissingRequirements(r.missingRequirements);
        toast.success("API key validated");
        setStep(5);
      } else {
        setKeyValidated(false);
        setKeyError(r.error);
        toast.error(r.error);
      }
    } catch {
      setKeyError("Could not validate API key. Please try again.");
    } finally {
      setValidatingKey(false);
    }
  };

  const refreshStatus = async (silent = false) => {
    if (!verifiedUser || !apiKey) return;
    setRefreshing(true);
    try {
      const r = await validateStatusFn({
        data: { apiKey: apiKey.trim(), universeId: verifiedUser.universeId },
      });
      if (r.ok) {
        setAgeRating(r.ageRating);
        setIsRatingUnavailable(r.isRatingUnavailable);
        setVisibility(r.visibility);
        setIsExperiencePublic(r.isPublic);
        setIsExperienceReady(r.isReady);
        setMissingRequirements(r.missingRequirements);
        if (r.isReady && !silent) toast.success("Status verified: Ready");
      } else if (!silent) {
        toast.error(r.error);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const submit = async () => {
    if (!user || !verifiedUser) return;
    if (!isExperienceReady) {
      return toast.error("Your experience must be Minimal and Public before submitting.");
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        roblox_username: verifiedUser.username,
        gamepass_link: null,
        roblox_api_key: apiKey.trim(),
        maturity_confirmed: true,
        package_name: `${selectedPkg.name} - ${selectedPkg.robux.toLocaleString("en-US")} Robux`,
        package_price: selectedPkg.price,
        payment_method: paymentMethod,
        transaction_id: transactionId || null,
        payment_proof: proofUrl,
        note: `Universe ID: ${verifiedUser.universeId}`,
        status: "pending",
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setCreatedId(data.id);
    setStep(6);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {step === 6 && createdId ? (
          <ConfirmationCard
            id={createdId}
            pkg={selectedPkg}
            method={selectedPay.label}
            username={verifiedUser?.username ?? robloxUsername}
            onView={() => nav({ to: "/dashboard" })}
            onDash={() => nav({ to: "/dashboard" })}
            copy={copy}
          />
        ) : (
          <>
            <Stepper step={step} />

            {step === 1 && (
              <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft animate-in fade-in duration-300">
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
              <div className="space-y-4 animate-in fade-in duration-300">
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
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={goToUsername} className="bg-gradient-primary text-primary-foreground">
                    Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Verify your Roblox account</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll fetch your public profile to confirm we're delivering Robux to the right account.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="ru">Roblox Username</Label>
                      <Input
                        id="ru"
                        value={robloxUsername}
                        onChange={(e) => setRobloxUsername(e.target.value)}
                        onBlur={() => robloxUsername.trim().length >= 3 && !verifiedUser && lookupUser()}
                        placeholder="@Username"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={lookupUser}
                        disabled={lookingUp || robloxUsername.trim().length < 3}
                        className="bg-gradient-primary text-primary-foreground"
                      >
                        {lookingUp ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Searching…</> : "Verify"}
                      </Button>
                    </div>
                  </div>

                  {lookupError && (
                    <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/5 p-3 text-sm text-rose-300 animate-in fade-in">
                      {lookupError}
                    </div>
                  )}

                  {verifiedUser && (
                    <div className="mt-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5">
                        <div className="flex items-center gap-4">
                          {verifiedUser.avatarUrl ? (
                            <img
                              src={verifiedUser.avatarUrl}
                              alt={verifiedUser.username}
                              className="h-16 w-16 rounded-full border border-emerald-500/40 bg-background"
                            />
                          ) : (
                            <div className="grid h-16 w-16 place-items-center rounded-full border border-emerald-500/40 bg-background text-xl font-bold">
                              {verifiedUser.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-lg font-semibold">{verifiedUser.displayName}</span>
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div className="text-sm text-muted-foreground">@{verifiedUser.username}</div>
                            <div className="mt-1 text-xs text-muted-foreground">User ID: <span className="font-mono">{verifiedUser.userId}</span></div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Public experience detected: <span className="text-foreground font-medium">{verifiedUser.placeName}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!verifiedUser}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    Yes, that's me! <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && verifiedUser && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Roblox API Key Setup</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Three quick steps. Your Universe ID has already been detected automatically.
                  </p>

                  <div className="mt-5 space-y-3">
                    <GuideStep n={1} title="Create API Key" desc="Open the official Roblox Credentials Dashboard to start a new API key.">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openExternal("https://create.roblox.com/dashboard/credentials")}
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Go to the Roblox Credentials Dashboard
                      </Button>
                    </GuideStep>

                    <GuideStep n={2} title="Configure API Key" desc="Set up the permissions exactly as listed below.">
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>• Enter any name</li>
                        <li>• Under <span className="text-foreground">Access Permissions</span>, select <span className="font-mono text-foreground">game-passes</span> with read + write access.</li>
                        <li>• Click <span className="text-foreground">Save &amp; Generate key</span></li>
                      </ul>
                    </GuideStep>

                    <GuideStep n={3} title="Copy & paste API key" desc="Paste the key generated in step 2 below.">
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ak">API key</Label>
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                            <Lock className="mr-1 h-3 w-3" /> Securely Encrypted
                          </Badge>
                        </div>
                        <Input
                          id="ak"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Paste your Roblox API key here..."
                          className="font-mono"
                        />
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Info className="h-3 w-3" /> Paste the full secret key from the
                          generate dialog. The shortened key shown later in the dashboard will not
                          work.
                        </p>
                        {keyError && (
                          <p className="text-xs text-rose-400">{keyError}</p>
                        )}
                      </div>
                    </GuideStep>
                  </div>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button
                    onClick={validateKey}
                    disabled={validatingKey || apiKey.trim().length < 20}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    {validatingKey ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Validating…</>
                    ) : (
                      <>Save &amp; Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && verifiedUser && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Experience Questionnaire</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your API key must be able to manage game passes, and the questionnaire page
                    must show a <span className="text-foreground font-medium">"Minimal"</span>{" "}
                    rating so Bloxflip can create a game pass.
                  </p>

                  <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Universe ID</div>
                        <div className="mt-0.5 font-mono text-sm">{verifiedUser.universeId}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/40 text-primary hover:text-primary"
                        onClick={() =>
                          openExternal(
                            `https://create.roblox.com/dashboard/creations/experiences/${verifiedUser.universeId}/experience-questionnaire`,
                          )
                        }
                      >
                        Fill out questionnaire <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">Current status</div>
                        <div className="mt-0.5 text-sm">
                          {isExperienceReady ? (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-200 border border-amber-500/40">
                              Not ready - {statusMessage}
                            </Badge>
                          )}
                        </div>
                        {ageRating && (
                          <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                            <div>
                              Questionnaire:{" "}
                              <span className="font-mono">
                                {formatAgeRating(ageRating)} ({ageRating})
                              </span>
                            </div>
                            <div>
                              Visibility:{" "}
                              <span className="font-mono">
                                {visibility ?? (isExperiencePublic ? "Public" : "Unknown")}
                              </span>
                            </div>
                          </div>
                        )}
                        {isRatingUnavailable && (
                          <p className="mt-2 text-[11px] text-amber-200">
                            Roblox Open Cloud does not expose the same questionnaire label that the
                            Creator Dashboard shows. If the questionnaire page shows Minimal and the
                            game-pass permission check passes, you can continue.
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => refreshStatus(false)}
                        disabled={refreshing || isExperienceReady}
                        className="bg-gradient-primary text-primary-foreground"
                      >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        {isExperienceReady ? "Verified" : refreshing ? "Checking..." : "Refresh"}
                      </Button>
                    </div>

                    {!isExperienceReady && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        We're auto-checking every 10 seconds. Once rating and visibility pass, the
                        "Submit ticket" button will unlock.
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                  <h3 className="text-lg font-semibold">Order summary</h3>
                  <div className="mt-3 grid gap-2 text-sm">
                    <Row label="Roblox account" value={`@${verifiedUser.username}`} />
                    <Row label="Package" value={`${selectedPkg.robux.toLocaleString("en-US")} Robux (${selectedPkg.name})`} />
                    <Row label="Price" value={`$${selectedPkg.price}`} />
                    <Row label="Payment method" value={selectedPay.label} />
                    <Row label="Transaction ID" value={transactionId || "—"} mono />
                  </div>
                </Card>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(4)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button
                    onClick={submit}
                    disabled={!isExperienceReady || submitting}
                    className="bg-gradient-primary text-primary-foreground"
                  >
                    {submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Sending...</> : "Submit ticket"}
                  </Button>
                </div>
              </div>
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

function ConfirmationCard({
  id, pkg, method, username, onView, onDash, copy,
}: {
  id: string;
  pkg: { robux: number; name: string; price: number; delivery: string };
  method: string;
  username: string;
  onView: () => void;
  onDash: () => void;
  copy: (s: string) => void;
}) {
  return (
    <Card className="border-border/60 bg-gradient-card p-10 text-center shadow-glow animate-in fade-in zoom-in-95 duration-500">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-9 w-9 text-emerald-400" />
      </div>
      <h1 className="mt-4 text-3xl font-bold">Ticket submitted</h1>
      <p className="mt-2 text-muted-foreground">
        Your order is being processed. You'll receive the Robux within 24 hours.
      </p>

      <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-4 py-2 font-mono text-sm">
        Ticket ID: #{id.slice(0, 8)}
        <button onClick={() => copy(id)} aria-label="Copy ticket id"><Copy className="h-3.5 w-3.5" /></button>
      </div>

      <div className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
        <Row label="Roblox account" value={`@${username}`} />
        <Row label="Package" value={`${pkg.robux.toLocaleString("en-US")} Robux (${pkg.name})`} />
        <Row label="Price" value={`$${pkg.price}`} />
        <Row label="Payment" value={method} />
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onView}>View orders</Button>
        <Button className="bg-gradient-primary text-primary-foreground" onClick={onDash}>Go to dashboard</Button>
      </div>
    </Card>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Package", "Payment", "Account", "API Key", "Status", "Done"];
  return (
    <div className="mb-8 flex items-center gap-2 sm:gap-3">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step >= n;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>{n}</div>
            <div className={`hidden text-xs md:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
