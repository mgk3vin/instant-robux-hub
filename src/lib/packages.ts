export interface Package {
  id: string;
  robux: number;
  name: string;
  price: number;
  popular?: boolean;
  delivery: string;
}

export const PACKAGES: Package[] = [
  { id: "p400", robux: 400, name: "Starter", price: 4.99, delivery: "~5 min" },
  { id: "p800", robux: 800, name: "Plus", price: 8.99, delivery: "~5 min", popular: true },
  { id: "p1700", robux: 1700, name: "Pro", price: 17.99, delivery: "~10 min" },
  { id: "p4500", robux: 4500, name: "Elite", price: 44.99, delivery: "~15 min" },
];

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  payment_received: "Payment Received",
  processing: "Processing",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  payment_received: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  processing: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};