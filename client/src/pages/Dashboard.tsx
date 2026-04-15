import { StatCard } from "@/components/StatCard";
import { InventoryChart } from "@/components/InventoryChart";
import { Users, Euro, Inbox } from "lucide-react";
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

  const clientData = useMemo(() => {
    return clients.map((client) => ({
      name: client.client_name,
      value: client.total_sold_amount,
    }));
  }, [clients]);

  const totalMonthlyRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.monthly_fee || 0), 0);
  }, [clients]);

  const totalStarterPackRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.starter_pack_price || 0), 0);
  }, [clients]);

  const totalHardwareSalesRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.hardware_price || 0), 0);
  }, [clients]);

  const activeClientsCount = useMemo(() => {
    return clients.filter((client) => (client.status || "active") === "active").length;
  }, [clients]);

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
        <h1 className="page-heading" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d'ensemble de votre inventaire matériel
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Revenu Mensuel Total"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalMonthlyRevenue)}
          icon={Euro}
          accent="indigo"
          animatedNumber={clientsLoading ? undefined : totalMonthlyRevenue}
          formatAnimated={formatCurrencyCompact}
          testId="card-monthly-revenue"
        />
        <StatCard
          title="Revenu Starter Pack"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalStarterPackRevenue)}
          icon={Euro}
          accent="emerald"
          animatedNumber={clientsLoading ? undefined : totalStarterPackRevenue}
          formatAnimated={formatCurrencyCompact}
          testId="card-starter-pack-revenue"
        />
        <StatCard
          title="Revenu Vente Materiel"
          value={clientsLoading ? "..." : formatCurrencyCompact(totalHardwareSalesRevenue)}
          icon={Euro}
          accent="amber"
          animatedNumber={clientsLoading ? undefined : totalHardwareSalesRevenue}
          formatAnimated={formatCurrencyCompact}
          testId="card-hardware-sales-revenue"
        />
        <StatCard
          title="Commissions Total"
          value={commissionsLoading ? "..." : formatCurrencyCompact(totalCommissions)}
          icon={Euro}
          accent="rose"
          animatedNumber={commissionsLoading ? undefined : totalCommissions}
          formatAnimated={formatCurrencyCompact}
          testId="card-total-commissions"
        />
        <StatCard
          title="Clients Actifs"
          value={clientsLoading ? "..." : activeClientsCount.toString()}
          icon={Users}
          accent="cyan"
          animatedNumber={clientsLoading ? undefined : activeClientsCount}
          formatAnimated={(n) => Math.round(n).toString()}
          testId="card-active-clients"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InventoryChart title="Valeur par Client" data={clientData} />

        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-sm font-semibold tracking-tight sm:text-base">
              Mouvements Récents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(60vh,420px)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className="table-head-enterprise">Date</TableHead>
                    <TableHead className="table-head-enterprise">Type</TableHead>
                    <TableHead className="table-head-enterprise">Produit</TableHead>
                    <TableHead className="table-head-enterprise text-right">Qté</TableHead>
                    <TableHead className="table-head-enterprise">Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.length === 0 ? (
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableCell colSpan={5} className="py-16">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
                            <Inbox className="size-6" aria-hidden />
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Aucun mouvement récent
                          </p>
                          <p className="max-w-sm text-xs text-muted-foreground">
                            Les entrées et sorties de stock apparaîtront ici lorsqu&apos;elles
                            seront enregistrées dans le système.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentMovements.map((movement, index) => (
                      <TableRow key={index} data-testid={`row-movement-${index}`}>
                        <TableCell className="text-sm">{movement.date}</TableCell>
                        <TableCell className="text-sm">{movement.type}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {movement.product}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {movement.quantity}
                        </TableCell>
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
