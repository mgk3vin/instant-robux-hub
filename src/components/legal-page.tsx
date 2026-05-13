import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">{title}</h1>
        <div className="prose prose-invert mt-8 max-w-none text-foreground/90 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:text-muted-foreground">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}