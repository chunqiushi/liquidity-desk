import { CURRENCIES } from "@/lib/mock-data";
import CurrencyDetail from "./CurrencyDetail";

export function generateStaticParams() {
  return CURRENCIES.map((c) => ({ slug: c.code }));
}

export default function Page() {
  return <CurrencyDetail />;
}
