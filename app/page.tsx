import { loadDefaultCsv } from "@/infrastructure/server/default-csv.loader";
import { CommissionWorkspace } from "@/presentation/commissions/components/CommissionWorkspace";

export default async function HomePage() {
  const initialCsv = await loadDefaultCsv();

  return <CommissionWorkspace initialCsv={initialCsv} />;
}
