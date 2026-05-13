import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({ component: () => (
  <LegalPage title="Privacy Policy">
    <p>We respect your privacy and only collect information needed to deliver orders.</p>
    <h2>Information we store</h2>
    <ul>
      <li>Account information (email, hashed password) used for authentication</li>
      <li>Order details (Roblox username, gamepass link, package, payment method)</li>
      <li>Uploaded payment proofs (only accessible to you and our support team)</li>
    </ul>
    <h2>Cookies</h2>
    <p>We use essential cookies to keep you signed in.</p>
    <h2>Data handling</h2>
    <p>Your data is stored in encrypted form and protected by row-level security.</p>
  </LegalPage>
)});
