import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/refund")({ component: () => (
  <LegalPage title="Refund Policy">
    <h2>Digital goods policy</h2>
    <p>Robux deliveries are final once the gamepass has been purchased on Roblox.</p>
    <h2>Eligible refunds</h2>
    <ul>
      <li>You paid but the order was cancelled by us before delivery</li>
      <li>An incorrect package was delivered due to our error</li>
    </ul>
    <h2>Chargeback abuse</h2>
    <p>Initiating a chargeback after delivery may result in a permanent ban from InstantBlox.</p>
  </LegalPage>
)});
