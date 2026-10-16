import { ECO_CONFIG } from "@/lib/cycle";
import EconomyCycle from "./EconomyCycle";

export function generateStaticParams() {
  return Object.keys(ECO_CONFIG).map((code) => ({ economy: code }));
}

export default function Page() {
  return <EconomyCycle />;
}
