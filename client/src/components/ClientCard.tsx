import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Package, Euro, Calendar, Edit, Trash2 } from "lucide-react";
import {
  formatCurrencyCompact,
  calculateProfitableDate,
} from "@/lib/utils";
import {
  calculateClientMetrics,
  calculateTotalMonthlyFeeFromProducts,
} from "@/lib/clientCalculations";
import { Client } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  client: Client;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function ClientCard({
  client,
  onViewDetails,
  onEdit,
  onDelete,
  isDeleting = false,
}: ClientCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { products } = useProducts();

  const metrics = calculateClientMetrics(client, products);
  const calculatedMonthlyFee = calculateTotalMonthlyFeeFromProducts(client);
  const displayMonthlyFee =
    client.monthly_fee && client.monthly_fee > 0
      ? client.monthly_fee
      : calculatedMonthlyFee;

  return (
    <Card
      className="group/card relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-[color:var(--enterprise-border-strong,hsl(var(--border)))]"
      data-testid={`card-client-${client.client_name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardHeader className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold tracking-tight sm:text-base">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" aria-hidden />
            </span>
            <span className="truncate">{client.client_name}</span>
          </CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
              metrics.is_profitable
                ? "border border-status-success/25 bg-status-success/10 text-status-success"
                : "border border-status-warning/30 bg-status-warning/10 text-status-warning"
            )}
          >
            {metrics.is_profitable ? "Profitable" : "Still covering investment"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Euro className="size-3.5 shrink-0 opacity-80" />
              <span>Montant d&apos;installation</span>
            </div>
            <p className="text-sm font-bold tabular-nums tracking-tight sm:text-base">
              {formatCurrencyCompact(metrics.installation_costs)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Euro className="size-3.5 shrink-0 opacity-80" />
              <span>Frais mensuels</span>
            </div>
            <p className="text-sm font-bold tabular-nums tracking-tight sm:text-base">
              {formatCurrencyCompact(displayMonthlyFee)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Flux net
            </span>
            <p
              className={cn(
                "text-sm font-bold tabular-nums tracking-tight sm:text-base",
                metrics.net_cash_flow >= 0 ? "text-status-success" : "text-status-error"
              )}
            >
              {metrics.net_cash_flow >= 0 ? "+" : ""}
              {formatCurrencyCompact(metrics.net_cash_flow)}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Revenus − coûts</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Package className="size-3.5 shrink-0 opacity-80" />
              <span>Quantité produits</span>
            </div>
            <p className="text-sm font-bold tabular-nums sm:text-base">{client.product_quantity}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3.5 shrink-0 opacity-80" />
              <span>Date de rentabilité</span>
            </div>
            <p className="text-sm font-bold tabular-nums text-primary sm:text-base">
              {metrics.profitability_date ||
                calculateProfitableDate(
                  client.contract_start_date,
                  client.months_left
                ) ||
                `${client.months_left} ${client.months_left === 1 ? "mois" : "mois"}`}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-lg border-border bg-secondary/50 font-medium text-secondary-foreground transition-colors duration-150 hover:bg-muted/60"
          onClick={onViewDetails}
          data-testid="button-view-details"
        >
          Voir Détails
        </Button>

        <div
          className={cn(
            "flex justify-end gap-1 transition-opacity duration-150",
            "opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100"
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-border hover:bg-muted/50"
            onClick={onEdit}
            data-testid="button-edit-client"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-border hover:bg-muted/50"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="button-delete-client"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le client</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client &quot;{client.client_name}&quot; ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
