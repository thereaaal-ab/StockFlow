import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Euro, Calendar, Edit, Trash2 } from "lucide-react";
import { formatCurrencyCompact, calculateProfitableDate } from "@/lib/utils";
import { calculateClientMetrics } from "@/lib/clientCalculations";
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

interface ClientCardProps {
  client: Client; // Pass full client object for accurate calculations
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
  
  // Calculate client metrics for status display
  const metrics = calculateClientMetrics(client, products);

  return (
    <Card className="hover-elevate" data-testid={`card-client-${client.client_name.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>{client.client_name}</span>
          </div>
          {client.contract_start_date && (
            <Badge
              variant={metrics.is_profitable ? "default" : "destructive"}
              className={metrics.is_profitable ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {metrics.is_profitable ? "Profitable" : "Still covering investment"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>Montant d'installation</span>
            </div>
            <p className="text-lg font-bold">{formatCurrencyCompact(client.total_sold_amount || 0)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>Frais Mensuels</span>
            </div>
            <p className="text-lg font-bold">{formatCurrencyCompact(client.monthly_fee)}</p>
          </div>
        </div>
        {client.contract_start_date && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Flux Net</span>
              <p className={`text-lg font-bold ${
                metrics.net_cash_flow >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {metrics.net_cash_flow >= 0 ? "+" : ""}
                {formatCurrencyCompact(metrics.net_cash_flow)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenus - Coûts
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Quantité Produits</span>
            </div>
            <p className="text-lg font-bold">{client.product_quantity}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date de Rentabilité</span>
            </div>
            <p className="text-lg font-bold text-primary">
              {calculateProfitableDate(client.contract_start_date, client.months_left) || 
                `${client.months_left} ${client.months_left === 1 ? "mois" : "mois"}`}
            </p>
            <p className="text-xs text-muted-foreground">(calculé automatiquement)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={onViewDetails}
            data-testid="button-view-details"
          >
            Voir Détails
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            data-testid="button-edit-client"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
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
              Êtes-vous sûr de vouloir supprimer le client "{client.client_name}" ? Cette action est irréversible.
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
