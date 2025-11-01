import { ClientCard } from "@/components/ClientCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function Clients() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const clients = [
    { name: "SameSame", hardwareCount: 8, totalValue: 12500 },
    { name: "O'Comptoir", hardwareCount: 5, totalValue: 8200 },
    { name: "CuzCup", hardwareCount: 12, totalValue: 18900 },
    { name: "GameSame", hardwareCount: 3, totalValue: 6700 },
  ];

  const handleViewDetails = (clientName: string) => {
    console.log("View details for:", clientName);
    setSelectedClient(clientName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Clients
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des clients et de leur matériel assigné
          </p>
        </div>
        <Button data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <ClientCard
            key={client.name}
            name={client.name}
            hardwareCount={client.hardwareCount}
            totalValue={client.totalValue}
            onViewDetails={() => handleViewDetails(client.name)}
          />
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        Total: {clients.length} clients actifs
      </div>
    </div>
  );
}
