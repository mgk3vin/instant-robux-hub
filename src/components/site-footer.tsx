import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </span>
              <span>InstantBlox</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Secure gamepass-based Robux delivery, powered by manual verification.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" hash="packages" className="hover:text-foreground">Packages</Link></li>
              <li><Link to="/new-order" className="hover:text-foreground">Create order</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="/refund" className="hover:text-foreground">Refund Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/" hash="faq" className="hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} InstantBlox. All rights reserved.</p>
          <p>InstantBlox is not affiliated with Roblox Corporation.</p>
        </div>
      </div>
    </footer>
  );
}