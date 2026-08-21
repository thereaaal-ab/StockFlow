import { StatCard } from "@/components/StatCard";
import { InventoryChart } from "@/components/InventoryChart";
import { Users, Euro, Inbox, Wallet } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils";
import { formatTTCCompact } from "@/lib/vat";
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
import { useProducts } from "@/hooks/useProducts";
import { useRecurringCosts } from "@/hooks/useRecurringCosts";
import { computeSummary } from "@shared/recurringCosts";
import { calculateHardwareMargin } from "@/lib/clientCalculations";
import { useMemo } from "react";

export default function Dashboard() {
  const { clients, isLoading: clientsLoading } = useClients();
  const { totalCommissions, isLoading: commissionsLoading } = useCommissions();
  const { products } = useProducts();
  const { entries: recurringEntries } = useRecurringCosts();

  /** Les clients résiliés ne rapportent plus rien : ils sortent des totaux. */
  const activeClients = useMemo(
    () => clients.filter((c) => (c.status || "active") === "active"),
    [clients]
  );

  const clientData = useMemo(() => {
    return clients.map((client) => ({
      name: client.client_name,
      value: client.total_sold_amount,
    }));
  }, [clients]);

  /** Le récurrent : ce qui retombe chaque mois, sans les encaissements uniques. */
  const totalMonthlyRevenue = useMemo(() => {
    return activeClients.reduce((sum, client) => sum + (client.monthly_fee || 0), 0);
  }, [activeClients]);

  // Les deux totaux qui suivent sont des CUMULS depuis le début, pas des
  // montants mensuels : un starter pack ne s'encaisse qu'une fois.
  const totalStarterPackRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.starter_pack_price || 0), 0);
  }, [clients]);

  const totalHardwareSalesRevenue = useMemo(() => {
    return clients.reduce((sum, client) => sum + (client.hardware_price || 0), 0);
  }, [clients]);

  /**
   * Le gain réel sur le matériel vendu : prix facturé moins prix payé, ligne
   * par ligne, et uniquement sur les lignes achetées. Le matériel loué n'entre
   * pas ici — son retour est la mensualité.
   */
  const hardwareMargin = useMemo(
    () =>
      clients.reduce(
        (sum, client) => sum + calculateHardwareMargin(client, products),
        0
      ),
    [clients, products]
  );

  /** Les charges fixes du mois, hors achats destinés à la revente. */
  const monthlyFixedCosts = useMemo(
    () => computeSummary(recurringEntries).totalMonthlyExpenses,
    [recurringEntries]
  );

  const activeClientsCount = activeClients.length;

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

      {/* Ce qui retombe chaque mois. Ces montants-là sont comparables entre
          eux : ce sont tous des mensualités. */}
      <section className="space-y-3">
        <h2 className="ro-overline text-[11px]">Chaque mois</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Mensualités clients HT"
            value={clientsLoading ? "..." : formatCurrencyCompact(totalMonthlyRevenue)}
            icon={Euro}
            accent="emerald"
            animatedNumber={clientsLoading ? undefined : totalMonthlyRevenue}
            formatAnimated={formatCurrencyCompact}
            secondary={formatTTCCompact(totalMonthlyRevenue)}
            testId="card-monthly-revenue"
          />
          <StatCard
            title="Coûts fixes HT"
            value={formatCurrencyCompact(monthlyFixedCosts)}
            icon={Wallet}
            accent="rose"
            animatedNumber={monthlyFixedCosts}
            formatAnimated={formatCurrencyCompact}
            secondary={formatTTCCompact(monthlyFixedCosts)}
            testId="card-monthly-fixed-costs"
          />
          <StatCard
            title="Net mensuel HT"
            value={
              clientsLoading
                ? "..."
                : formatCurrencyCompact(totalMonthlyRevenue - monthlyFixedCosts)
            }
            icon={Euro}
            accent={totalMonthlyRevenue - monthlyFixedCosts >= 0 ? "emerald" : "rose"}
            animatedNumber={
              clientsLoading ? undefined : totalMonthlyRevenue - monthlyFixedCosts
            }
            formatAnimated={formatCurrencyCompact}
            testId="card-monthly-net"
          />
          <StatCard
            title="Clients actifs"
            value={clientsLoading ? "..." : activeClientsCount.toString()}
            icon={Users}
            accent="indigo"
            animatedNumber={clientsLoading ? undefined : activeClientsCount}
            formatAnimated={(n) => Math.round(n).toString()}
            testId="card-active-clients"
          />
        </div>
      </section>

      {/* Les encaissements uniques, cumulés depuis le début. Les mélanger aux
          mensualités ci-dessus laisserait croire qu'ils rentrent tous les
          mois : ils sont donc dans leur propre rangée, et l'étiquette le dit. */}
      <section className="space-y-3">
        <h2 className="ro-overline text-[11px]">Depuis le début · encaissements uniques</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Starter packs HT"
            value={clientsLoading ? "..." : formatCurrencyCompact(totalStarterPackRevenue)}
            icon={Euro}
            accent="amber"
            animatedNumber={clientsLoading ? undefined : totalStarterPackRevenue}
            formatAnimated={formatCurrencyCompact}
            secondary={formatTTCCompact(totalStarterPackRevenue)}
            testId="card-starter-pack-revenue"
          />
          <StatCard
            title="Vente matériel HT"
            value={clientsLoading ? "..." : formatCurrencyCompact(totalHardwareSalesRevenue)}
            icon={Euro}
            accent="slate"
            animatedNumber={clientsLoading ? undefined : totalHardwareSalesRevenue}
            formatAnimated={formatCurrencyCompact}
            secondary={formatTTCCompact(totalHardwareSalesRevenue)}
            testId="card-hardware-sales-revenue"
          />
          <StatCard
            title="Gain sur matériel"
            value={clientsLoading ? "..." : formatCurrencyCompact(hardwareMargin)}
            icon={Euro}
            accent={hardwareMargin >= 0 ? "emerald" : "rose"}
            animatedNumber={clientsLoading ? undefined : hardwareMargin}
            formatAnimated={formatCurrencyCompact}
            testId="card-hardware-margin"
          />
          <StatCard
            title="Commissions"
            value={commissionsLoading ? "..." : formatCurrencyCompact(totalCommissions)}
            icon={Euro}
            accent="cyan"
            animatedNumber={commissionsLoading ? undefined : totalCommissions}
            formatAnimated={formatCurrencyCompact}
            testId="card-total-commissions"
          />
        </div>
      </section>

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
