import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Euro, Package, Calendar, CalendarClock } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { formatCurrencyFull } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientDetailsModal({
  open,
  onOpenChange,
  client,
}: ClientDetailsModalProps) {
  const { products } = useProducts();

  if (!client) return null;

  const product = client.product_id
    ? products.find((p) => p.id === client.product_id)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Détails du Client
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur {client.client_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Nom du Client
                  </span>
                  <span className="text-lg font-semibold">
                    {client.client_name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Euro className="h-4 w-4" />
                      <span>Montant Total Vendu</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrencyFull(client.total_sold_amount)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Euro className="h-4 w-4" />
                      <span>Frais Mensuels</span>
                    </div>
                    <p className="text-xl font-bold">
                      {formatCurrencyFull(client.monthly_fee)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Quantité de Produits</span>
                    </div>
                    <p className="text-xl font-bold">
                      {client.product_quantity}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Mois Restants</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {client.months_left} {client.months_left === 1 ? "mois" : "mois"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (calculé automatiquement)
                    </p>
                  </div>
                </div>

                {product && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Produit Associé</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Catégorie: {product.category || "Non spécifiée"}
                      </p>
                      {product.code && (
                        <p className="text-sm text-muted-foreground">
                          Code: {product.code}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {client.created_at && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      <span>Date de Création</span>
                    </div>
                    <p className="text-sm">
                      {new Date(client.created_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}


