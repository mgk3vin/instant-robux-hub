import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Zap,
  Users,
  Star,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  HeadphonesIcon,
  Lock,
} from "lucide-react";
import { PACKAGES } from "@/lib/packages";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [reviews, setReviews] = useState<Array<{ id: string; username: string; rating: number; review_text: string }>>([]);

  useEffect(() => {
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(6).then(({ data }) => {
      if (data) setReviews(data);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="mr-1 h-3 w-3" /> Trusted by 12,000+ gamers
            </Badge>
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Buy Robux <span className="text-gradient">Quickly & Securely</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              InstantBlox uses a safe gamepass-based delivery system with manual verification —
              your order, reviewed by a real person, delivered in minutes.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" asChild>
                <Link to="/new-order">Create Order <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/" hash="packages">View Packages</Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> No login required to browse</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Manual verification</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> 5-min average delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Featured packages</h2>
          <p className="mt-3 text-muted-foreground">Pick a package and start in under a minute.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((p) => (
            <Card key={p.id} className={`group relative overflow-hidden border-border/60 bg-gradient-card p-6 shadow-card-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow ${p.popular ? "ring-1 ring-primary/40" : ""}`}>
              {p.popular && (
                <Badge className="absolute right-4 top-4 bg-gradient-primary text-primary-foreground">Most Popular</Badge>
              )}
              <div className="text-sm uppercase tracking-wider text-muted-foreground">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gradient">{p.robux.toLocaleString("en-US")}</span>
                <span className="text-sm text-muted-foreground">Robux</span>
              </div>
              <div className="mt-1 text-2xl font-semibold">${p.price}</div>
              <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" /> {p.delivery}
              </div>
              <Button className="mt-6 w-full bg-gradient-primary text-primary-foreground hover:opacity-90" asChild>
                <Link to="/new-order" search={{ pkg: p.id }}>Order now</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section id="how-it-works" className="border-y border-border/60 bg-card/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Why thousands trust InstantBlox</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Secure Delivery", desc: "End-to-end encrypted handling of every order." },
              { icon: HeadphonesIcon, title: "Fast Support", desc: "Real humans on standby, average reply in minutes." },
              { icon: Lock, title: "Manual Verification", desc: "Each order is checked by a person before fulfilment." },
              { icon: Users, title: "Trusted by Thousands", desc: "12,000+ orders delivered with a 4.9★ rating." },
            ].map((f) => (
              <Card key={f.title} className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-2xl border border-border/60 bg-gradient-card p-8 shadow-card-soft sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: "12,000+", l: "Orders delivered" },
            { v: "4.9/5", l: "Customer rating" },
            { v: "5 min", l: "Average delivery" },
            { v: "2,500+", l: "Returning customers" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-4xl font-bold text-gradient">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Loved by the community</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <Card key={r.id} className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
              <div className="flex items-center gap-1 text-amber-300">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground/90">"{r.review_text}"</p>
              <div className="mt-4 text-sm font-medium text-muted-foreground">— {r.username}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 bg-card/30 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "How does delivery work?", a: "You create a Roblox gamepass at the exact price we tell you. We purchase the gamepass to deliver the Robux — Roblox handles the actual transfer." },
              { q: "How do I create a Roblox gamepass?", a: "Open Roblox, go to one of your experiences → Monetization → Passes → Create a Pass. We provide a step-by-step tutorial inside the order flow." },
              { q: "How long does delivery take?", a: "Most orders are completed in under 5 minutes after payment is verified. Larger packages may take up to 15 minutes." },
              { q: "Is this safe?", a: "Yes. We never ask for your Roblox password. All deliveries happen through the official gamepass system, and every order is manually reviewed." },
              { q: "What payment methods are supported?", a: "Crypto, PayPal and Card — all handled manually. Instructions are shown after you create your order." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-card p-10 text-center shadow-glow">
          <div className="absolute inset-0 -z-10 bg-hero opacity-50" />
          <Zap className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Ready to get your Robux?</h2>
          <p className="mt-3 text-muted-foreground">Create your order in under a minute.</p>
          <Button size="lg" className="mt-6 bg-gradient-primary text-primary-foreground hover:opacity-90" asChild>
            <Link to="/new-order">Create Order <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}
