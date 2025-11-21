import { StatCard } from "@/components/StatCard";
import { InventoryChart } from "@/components/InventoryChart";
import { Users, Euro } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients } from "@/hooks/useClients";
import { useCommissions } from "@/hooks/useCommissions";
import { useMemo } from "react";

export default function Dashboard() {
  const { clients, isLoading: clientsLoading } = useClients();
  const { totalCommissions, isLoading: commissionsLoading } = useCommissions();

  // Calculate client data from real products and clients
  const clientData = useMemo(() => {
    // Use total_sold_amount as the value for the chart
    return clients.map((client) => ({
      name: client.client_name,
      value: client.total_sold_amount,
    }));
  }, [clients]);

  // Calculate total monthly revenue (sum of all clients' monthly payments)
  const totalMonthlyRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.monthly_fee || 0), 0);
  }, [clients]);

  // Calculate total starter pack revenue
  const totalStarterPackRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.starter_pack_price || 0), 0);
  }, [clients]);

  // Count active clients
  const activeClientsCount = useMemo(() => {
    return clients.filter((client) => (client.status || "active") === "active").length;
  }, [clients]);

  // Recent movements - empty for now, can be enhanced with actual movement tracking
  const recentMovements: Array<{
    date: string;
    type: string;
    product: string;
    quantity: number;
    client: string;
  }> = [];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre inventaire matériel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenu Mensuel Total"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalMonthlyRevenue)}
          icon={Euro}
          testId="card-monthly-revenue"
        />
        <StatCard
          title="Revenu Starter Pack"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalStarterPackRevenue)}
          icon={Euro}
          testId="card-starter-pack-revenue"
        />
        <StatCard
          title="Commissions Total"
          value={commissionsLoading ? "..." : formatCurrencyCompact(totalCommissions)}
          icon={Euro}
          testId="card-total-commissions"
        />
        <StatCard
          title="Clients Actifs"
          value={clientsLoading ? "..." : activeClientsCount.toString()}
          icon={Users}
          testId="card-active-clients"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryChart
          title="Valeur par Client"
          data={clientData}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mouvements Récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead>Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                        Aucun mouvement récent
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentMovements.map((movement, index) => (
                      <TableRow key={index} data-testid={`row-movement-${index}`}>
                        <TableCell className="text-sm">{movement.date}</TableCell>
                        <TableCell className="text-sm">{movement.type}</TableCell>
                        <TableCell className="text-sm font-medium">{movement.product}</TableCell>
                        <TableCell className="text-right text-sm">{movement.quantity}</TableCell>
                        <TableCell className="text-sm">{movement.client}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
