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
import { formatCurrencyFull } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { calculateClientMetrics } from "@/lib/clientCalculations";

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

  // Calculate client metrics for display
  const metrics = calculateClientMetrics(client, products);

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

                {client.contract_start_date && (
                  <>
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Euro className="h-4 w-4" />
                            <span>Investissement Total</span>
                          </div>
                          <p className="text-lg font-bold">
                            {formatCurrencyFull(metrics.total_investment)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Starter Pack: {formatCurrencyFull(client.starter_pack_price || 0)} • 
                            Investissement Hardware: {formatCurrencyFull(metrics.total_investment - (client.starter_pack_price || 0))}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Revenu Mois 1:</span>
                              <span className="font-medium">{formatCurrencyFull(metrics.first_month_revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Revenu Cumulatif:</span>
                              <span className="font-medium">{formatCurrencyFull(metrics.cumulative_revenue)}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Mois Passés:</span>
                                <span className="font-medium">{metrics.months_passed}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-muted-foreground">Statut:</span>
                                <span className={`font-medium ${metrics.is_profitable ? 'text-green-500' : 'text-red-500'}`}>
                                  {metrics.is_profitable ? '✓ Profitable' : '✗ En cours de couverture'}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {metrics.cumulative_revenue >= metrics.total_investment 
                                  ? `Revenu (${formatCurrencyFull(metrics.cumulative_revenue)}) >= Investissement (${formatCurrencyFull(metrics.total_investment)})`
                                  : `Revenu (${formatCurrencyFull(metrics.cumulative_revenue)}) < Investissement (${formatCurrencyFull(metrics.total_investment)})`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

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


