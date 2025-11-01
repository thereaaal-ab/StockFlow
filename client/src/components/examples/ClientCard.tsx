import { ClientCard } from "../ClientCard";

export default function ClientCardExample() {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ClientCard
        name="SameSame"
        hardwareCount={8}
        totalValue={12500}
        onViewDetails={() => console.log("View SameSame details")}
      />
      <ClientCard
        name="O'Comptoir"
        hardwareCount={5}
        totalValue={8200}
        onViewDetails={() => console.log("View O'Comptoir details")}
      />
      <ClientCard
        name="CuzCup"
        hardwareCount={12}
        totalValue={18900}
        onViewDetails={() => console.log("View CuzCup details")}
      />
    </div>
  );
}
