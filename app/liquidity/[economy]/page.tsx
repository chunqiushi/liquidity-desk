import { LQ_ORDER } from "@/lib/liquidity";
import EconomyLiquidity from "./EconomyLiquidity";

export function generateStaticParams() {
  return LQ_ORDER.map((code) => ({ economy: code }));
}

export default function Page() {
  return <EconomyLiquidity />;
}
