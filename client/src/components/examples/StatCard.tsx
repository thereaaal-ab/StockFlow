import { StatCard } from "../StatCard";
import { Package } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Matériel"
        value="142"
        icon={Package}
        trend={{ value: "+12%", isPositive: true }}
        testId="card-total-hardware"
      />
      <StatCard
        title="Valeur Stock"
        value="5,734 €"
        icon={Package}
        testId="card-stock-value"
      />
    </div>
  );
}
