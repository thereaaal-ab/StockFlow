import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Package, Euro, Calendar, Edit, Trash2 } from "lucide-react";
import {
  formatCurrencyCompact,
} from "@/lib/utils";
import {
  calculateTotalMonthlyFeeFromProducts,
  calculateClientEconomics,
} from "@/lib/clientCalculations";
import { useCategories } from "@/hooks/useCategories";
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
  const { categories } = useCategories();

  // Les références de service n'ont ni coût d'achat ni investissement.
  const serviceProductIds = new Set(
    products
      .filter((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        return !!cat && cat.name.toLowerCase().startsWith("service");
      })
      .map((p) => p.id)
  );

  // Même calcul que la fiche : la pastille de la carte et le détail ne
  // doivent jamais dire l'inverse l'un de l'autre.
  const eco = calculateClientEconomics(client, { serviceProductIds });
  const calculatedMonthlyFee = calculateTotalMonthlyFeeFromProducts(client);
  const displayMonthlyFee =
    client.monthly_fee && client.monthly_fee > 0
      ? client.monthly_fee
      : calculatedMonthlyFee;

  return (
    <Card
      className="group/card ro-lift relative overflow-hidden rounded-xl border border-card-border bg-card shadow-card"
      data-testid={`card-client-${client.client_name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardHeader className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm font-extrabold tracking-heading sm:text-base">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mint-50 text-mint-600 dark:bg-mint-900 dark:text-mint-400">
              <Users className="size-4" aria-hidden />
            </span>
            <span className="truncate">{client.client_name}</span>
          </CardTitle>
          {/* Un badge dit un mot. « Rentable » / « À couvrir », pas une phrase. */}
          <span
            className={cn(
              "ro-badge shrink-0 py-1",
              eco.toCover === 0 ? "ro-badge-success" : "ro-badge-warning"
            )}
          >
            {eco.toCover === 0 ? "Rentable" : "À couvrir"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="space-y-1">
            <div className="ro-overline flex items-center gap-2 text-[10px]">
              <Euro className="size-3.5 shrink-0" />
              <span>Encaissé au départ</span>
            </div>
            <p className="ro-figure text-lg">
              {formatCurrencyCompact(eco.initialPayment + eco.equipmentBilled)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="ro-overline flex items-center gap-2 text-[10px]">
              <Euro className="size-3.5 shrink-0" />
              <span>Mensuel</span>
            </div>
            <p className="ro-figure text-lg">
              {formatCurrencyCompact(displayMonthlyFee)}
            </p>
          </div>
        </div>

        {/* Le net du premier mois : tout ce qui rentre, moins le seul vrai
            investissement — le matériel qui reste à nous. Même calcul que la
            fiche : deux chiffres qui se contredisent sur la même carte, c'est
            ce qui rendait la lecture impossible. */}
        <div className="rounded-md bg-muted px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="ro-overline text-[10px]">Net premier mois</span>
            <p
              className={cn(
                "ro-figure text-xl",
                eco.firstMonth - eco.leaseCost >= 0
                  ? "text-status-success"
                  : "text-status-error"
              )}
            >
              {eco.firstMonth - eco.leaseCost >= 0 ? "+" : ""}
              {formatCurrencyCompact(eco.firstMonth - eco.leaseCost)}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Encaissé − matériel en leasing
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="space-y-1">
            <div className="ro-overline flex items-center gap-2 text-[10px]">
              <Package className="size-3.5 shrink-0" />
              <span>Produits</span>
            </div>
            <p className="ro-figure text-lg">{client.product_quantity}</p>
          </div>
          <div className="space-y-1">
            <div className="ro-overline flex items-center gap-2 text-[10px]">
              <Calendar className="size-3.5 shrink-0" />
              <span>Rentabilité</span>
            </div>
            <p className="ro-data text-sm font-bold text-foreground">
              {eco.toCover === 0
                ? "1er mois"
                : eco.breakEvenDate
                  ? eco.breakEvenDate.toLocaleDateString("fr-FR", {
                      month: "short",
                      year: "numeric",
                    })
                  : eco.monthsToCover !== null
                    ? `${eco.monthsToCover} mois`
                    : "—"}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
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
            className="size-8"
            onClick={onEdit}
            data-testid="button-edit-client"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
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
              className="bg-destructive text-destructive-foreground shadow-danger hover:bg-[#C93B40]"
              disabled={isDeleting}
            >
              {/* Un bouton destructif répète son verbe, jamais « OK ». */}
              {isDeleting ? "Suppression…" : "Supprimer le client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
