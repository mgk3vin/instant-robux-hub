import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({ component: () => (
  <LegalPage title="Terms of Service">
    <p>InstantBlox sells access to a digital fulfillment service. All deliveries happen through Roblox's official gamepass system.</p>
    <h2>No affiliation with Roblox</h2>
    <p>InstantBlox is an independent third-party service and is not affiliated with, endorsed by, or sponsored by Roblox Corporation.</p>
    <h2>Third-party service statement</h2>
    <p>We rely on Roblox's platform to complete deliveries and are not responsible for downtime or policy changes.</p>
    <h2>Refund limitations</h2>
    <p>Once a gamepass purchase has been completed, the order is considered delivered and is not refundable.</p>
    <h2>Fraud prevention</h2>
    <p>We reserve the right to cancel any order suspected of fraud, chargeback abuse, or impersonation.</p>
    <h2>Delivery disclaimer</h2>
    <p>Delivery times are estimates. Manual verification may extend delivery during high-volume periods.</p>
  </LegalPage>
)});
