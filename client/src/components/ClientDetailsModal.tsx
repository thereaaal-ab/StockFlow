import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Euro, Package, Calendar, CalendarClock, TrendingUp } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { formatCurrencyFull, calculateProfitableDate } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { calculateClientMetrics, calculateTotalMonthlyFeeFromProducts } from "@/lib/clientCalculations";

interface ClientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

import { ClientHardwarePanel } from "@/components/ClientHardwarePanel";

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

  // Calculate client metrics for display
  const metrics = calculateClientMetrics(client, products);
  
  // Calculate total monthly fee from products (auto-calculated)
  const calculatedMonthlyFee = calculateTotalMonthlyFeeFromProducts(client);
  
  // Use calculated monthly fee if client.monthly_fee is not set or is 0
  // This allows manual override while defaulting to calculated value
  const displayMonthlyFee = client.monthly_fee && client.monthly_fee > 0 
    ? client.monthly_fee 
    : calculatedMonthlyFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
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
                      <span>Encaissement initial</span>
                    </div>
                    {/* Ce que le client verse au démarrage. `installation_costs`
                        ne convient pas : elle mélange prix payés et prix
                        facturés selon le type de ligne. */}
                    <p className="text-xl font-bold text-primary">
                      {formatCurrencyFull(
                        (client.starter_pack_price || 0) +
                          (client.hardware_price || 0)
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Euro className="h-4 w-4" />
                      <span>Frais Mensuels Totaux (€)</span>
                    </div>
                    <p className="text-xl font-bold">
                      {formatCurrencyFull(displayMonthlyFee)}
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
                      <span>Date de Rentabilité</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {metrics.profitability_date || 
                        calculateProfitableDate(client.contract_start_date, client.months_left) || 
                        `${client.months_left} ${client.months_left === 1 ? "mois" : "mois"}`}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      <span>Statut d'Investissement</span>
                    </div>
                    <Badge
                      variant={metrics.is_profitable ? "default" : "destructive"}
                      className={metrics.is_profitable ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {metrics.is_profitable ? "Profitable" : "Still covering investment"}
                    </Badge>
                  </div>
                  {client.contract_start_date && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Mois Passés</span>
                        </div>
                        <p className="text-lg font-bold">
                          {metrics.months_passed} {metrics.months_passed === 1 ? "mois" : "mois"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Depuis le {new Date(client.contract_start_date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Euro className="h-4 w-4" />
                          <span>Revenu Cumulatif</span>
                        </div>
                        <p className="text-lg font-bold">
                          {formatCurrencyFull(metrics.cumulative_revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Revenu total depuis le début
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Le détail financier vit désormais dans « Ce que ce client
                      rapporte », plus bas. L'ancien bloc affichait le même
                      montant comme coût ET comme profit : `installation_costs`
                      retient le prix facturé, pas le prix payé. */}
                  <div className="mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        <span>Encaissé à ce jour</span>
                      </div>
                      <p className="text-lg font-bold text-green-500">
                        +{formatCurrencyFull(metrics.total_revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dont {formatCurrencyFull(metrics.profit_mensuel)} de
                        mensualités cumulées.
                      </p>
                    </div>
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

          {/* Le matériel réellement posé chez ce client, et son ROI. */}
          <ClientHardwarePanel client={client} monthlyFee={displayMonthlyFee} />
        </div>
      </DialogContent>
    </Dialog>
  );
}


