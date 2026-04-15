import { ClientCard } from "../ClientCard";
import type { Client } from "@/hooks/useClients";

function mockClient(partial: Partial<Client> & Pick<Client, "client_name">): Client {
  const { client_name, ...rest } = partial;
  return {
    id: rest.id ?? `ex-${client_name}`,
    client_name,
    total_sold_amount: rest.total_sold_amount ?? 10_000,
    monthly_fee: rest.monthly_fee ?? 500,
    product_quantity: rest.product_quantity ?? 4,
    months_left: rest.months_left ?? 12,
    status: rest.status ?? "active",
    starter_pack_price: rest.starter_pack_price ?? 1000,
    hardware_price: rest.hardware_price ?? 2000,
    contract_start_date:
      rest.contract_start_date ?? new Date().toISOString().slice(0, 10),
    ...rest,
  };
}

export default function ClientCardExample() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      <ClientCard
        client={mockClient({ client_name: "SameSame", product_quantity: 8 })}
        onViewDetails={() => console.log("View SameSame details")}
        onEdit={() => {}}
        onDelete={() => {}}
      />
      <ClientCard
        client={mockClient({ client_name: "O'Comptoir", product_quantity: 5 })}
        onViewDetails={() => console.log("View O'Comptoir details")}
        onEdit={() => {}}
        onDelete={() => {}}
      />
      <ClientCard
        client={mockClient({ client_name: "CuzCup", product_quantity: 12 })}
        onViewDetails={() => console.log("View CuzCup details")}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}
