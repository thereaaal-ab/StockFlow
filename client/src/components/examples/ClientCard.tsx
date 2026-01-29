import { ClientCard } from "../ClientCard";
import { Client } from "@/hooks/useClients";

export default function ClientCardExample() {
  // Example client data for demonstration
  const exampleClients: Client[] = [
    {
      id: "example-1",
      client_name: "SameSame",
      total_sold_amount: 0,
      monthly_fee: 0,
      product_quantity: 8,
      months_left: 0,
      products: [],
    },
    {
      id: "example-2",
      client_name: "O'Comptoir",
      total_sold_amount: 0,
      monthly_fee: 0,
      product_quantity: 5,
      months_left: 0,
      products: [],
    },
    {
      id: "example-3",
      client_name: "CuzCup",
      total_sold_amount: 0,
      monthly_fee: 0,
      product_quantity: 12,
      months_left: 0,
      products: [],
    },
  ];

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exampleClients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          onViewDetails={() => console.log(`View ${client.client_name} details`)}
          onEdit={() => console.log(`Edit ${client.client_name}`)}
          onDelete={() => console.log(`Delete ${client.client_name}`)}
        />
      ))}
    </div>
  );
}
