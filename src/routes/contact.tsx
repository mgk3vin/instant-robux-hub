import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: () => (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Contact us</h1>
        <p className="mt-3 text-muted-foreground">Need help with an order? Reach out anytime.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
            <Mail className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Email</h2>
            <p className="mt-1 text-sm text-muted-foreground">support@instantblox.demo</p>
          </Card>
          <Card className="border-border/60 bg-gradient-card p-6 shadow-card-soft">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Live chat</h2>
            <p className="mt-1 text-sm text-muted-foreground">Available 24/7 from your dashboard.</p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});
