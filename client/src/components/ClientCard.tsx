import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Package, Euro, Calendar, Edit, Trash2 } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils";
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
  name: string;
  totalSoldAmount: number;
  monthlyFee: number;
  productQuantity: number;
  monthsLeft: number;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function ClientCard({ 
  name,
  totalSoldAmount, 
  monthlyFee, 
  productQuantity, 
  monthsLeft, 
  onViewDetails,
  onEdit,
  onDelete,
  isDeleting = false,
}: ClientCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <Card className="hover-elevate" data-testid={`card-client-${name.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span>{name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>Montant Vendu</span>
            </div>
            <p className="text-lg font-bold">{formatCurrencyCompact(totalSoldAmount)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>Frais Mensuels</span>
            </div>
            <p className="text-lg font-bold">{formatCurrencyCompact(monthlyFee)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Quantité Produits</span>
            </div>
            <p className="text-lg font-bold">{productQuantity}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Mois Restants</span>
            </div>
            <p className="text-lg font-bold text-primary">
              {monthsLeft} {monthsLeft === 1 ? "mois" : "mois"}
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
              Êtes-vous sûr de vouloir supprimer le client "{name}" ? Cette action est irréversible.
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
