import { StatCard } from "@/components/StatCard";
import { InventoryChart } from "@/components/InventoryChart";
import { Package, Warehouse, Users, Euro } from "lucide-react";
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
import { useDashboardCounts } from "@/hooks/useDashboardCounts";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useMemo } from "react";

export default function Dashboard() {
  const { counts, isLoading: countsLoading } = useDashboardCounts();
  const { products, isLoading: productsLoading } = useProducts();
  const { clients, isLoading: clientsLoading } = useClients();

  // Calculate client data from real products and clients
  const clientData = useMemo(() => {
    // Use total_sold_amount as the value for the chart
    return clients.map((client) => ({
      name: client.client_name,
      value: client.total_sold_amount,
    }));
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
          title="Total Matériel"
          value={countsLoading ? "..." : counts.productCount.toString()}
          icon={Package}
          testId="card-total-hardware"
        />
        <StatCard
          title="Stock Disponible"
          value={countsLoading ? "..." : counts.availableStockCount.toString()}
          icon={Warehouse}
          testId="card-available-stock"
        />
        <StatCard
          title="Clients Actifs"
          value={countsLoading ? "..." : counts.clientCount.toString()}
          icon={Users}
          testId="card-active-clients"
        />
        <StatCard
          title="Valeur Totale"
          value={countsLoading ? "..." : formatCurrencyCompact(counts.totalValue)}
          icon={Euro}
          testId="card-total-value"
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
