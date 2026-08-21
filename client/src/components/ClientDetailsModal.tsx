import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Euro, Package, Calendar, CalendarClock, TrendingUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Client } from "@/hooks/useClients";
import { formatCurrencyFull } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import {
  calculateClientMetrics,
  calculateTotalMonthlyFeeFromProducts,
  calculateClientEconomics,
} from "@/lib/clientCalculations";

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
  const { categories } = useCategories();
  const [showLines, setShowLines] = useState(false);

  /**
   * Les références de service : leur « prix d'achat » au catalogue est un
   * tarif de référence, pas une sortie d'argent. On ne l'affiche donc pas
   * dans la colonne « payé » — sinon le tableau contredirait le calcul de
   * marge, qui les exclut.
   */
  const serviceProductIds = (() => {
    const serviceCats = new Set(
      categories
        .filter((c) => c.name.toLowerCase().startsWith("service"))
        .map((c) => c.id)
    );
    return new Set(
      products
        .filter((p) => p.category_id && serviceCats.has(p.category_id))
        .map((p) => p.id)
    );
  })();


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
  // Le même calcul que le panneau plus bas : afficher deux dates de
  // rentabilité qui se contredisent est pire que n'en afficher aucune.
  const eco = calculateClientEconomics(client, {
    serviceProductIds,
    monthlyFee: displayMonthlyFee,
  });

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
                  {/* Le compte seul ne dit rien : on peut l'ouvrir pour voir
                      quelles lignes le composent et à quel prix. */}
                  <button
                    type="button"
                    className="space-y-2 rounded-md text-left transition-colors duration-fast ease-ro hover:bg-muted"
                    onClick={() => setShowLines((v) => !v)}
                    data-testid="button-toggle-product-lines"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Quantité de Produits</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-fast ease-ro",
                          showLines && "rotate-180"
                        )}
                      />
                    </div>
                    <p className="text-xl font-bold">
                      {client.product_quantity}
                    </p>
                  </button>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Date de Rentabilité</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {eco.isPaidBack
                        ? "Remboursé"
                        : eco.breakEvenDate
                          ? eco.breakEvenDate.toLocaleDateString("fr-FR", {
                              month: "long",
                              year: "numeric",
                            })
                          : eco.monthsToCover !== null
                            ? `${eco.monthsToCover} mois`
                            : "—"}
                    </p>
                  </div>
                </div>

                {/* Les lignes du client, avec ce qu'elles nous coûtent et ce
                    qu'elles rapportent. Une ligne en location rapporte chaque
                    mois ; une ligne achetée rapporte une fois. */}
                {showLines && (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="table-head-enterprise">Produit</th>
                          <th className="table-head-enterprise text-right">Qté</th>
                          <th className="table-head-enterprise text-right">Payé</th>
                          <th className="table-head-enterprise text-right">Facturé</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(client.products ?? []).map((line, i) => {
                          const isLease = line.type === "rent";
                          const isService = serviceProductIds.has(line.productId);
                          const billed = isLease
                            ? line.monthlyFee || 0
                            : line.clientPrice || 0;
                          return (
                            <tr
                              key={`${line.productId}-${i}`}
                              className="border-b border-border last:border-b-0"
                            >
                              <td className="px-4 py-2.5 align-middle text-sm">
                                <div className="font-medium">{line.name}</div>
                                <div className="ro-overline text-[9px]">
                                  {isService
                                    ? "service"
                                    : isLease
                                      ? "location"
                                      : "vendu"}
                                </div>
                              </td>
                              <td className="ro-data px-4 py-2.5 text-right align-middle text-sm">
                                {line.quantity}
                              </td>
                              <td className="ro-data px-4 py-2.5 text-right align-middle text-sm text-muted-foreground">
                                {isService || !line.purchasePrice
                                  ? "—"
                                  : formatCurrencyFull(line.purchasePrice)}
                              </td>
                              <td className="ro-data px-4 py-2.5 text-right align-middle text-sm font-bold">
                                {billed > 0 ? formatCurrencyFull(billed) : "—"}
                                {isLease && billed > 0 && (
                                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                    /mois
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {(client.products ?? []).length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-6 text-center text-sm text-muted-foreground"
                            >
                              Aucune ligne enregistrée pour ce client.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                      Les lignes de service n&apos;ont pas de prix payé : elles ne
                      s&apos;achètent à personne.
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      <span>Statut d'Investissement</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        eco.isPaidBack ? "ro-badge-success" : "ro-badge-warning"
                      }
                    >
                      {/* Même source que la date juste au-dessus : un badge
                          qui contredit la date qu'il accompagne est pire
                          qu'aucun badge. */}
                      {eco.isPaidBack ? "Rentable" : "À couvrir"}
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


