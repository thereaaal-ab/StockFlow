import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";

interface HardwareItem {
  code: string;
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  netValue: number;
  totalValue: number;
  id?: string;
}

interface HardwareTableProps {
  data: (HardwareItem | Product)[];
  showActions?: boolean;
  showStock?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function HardwareTable({
  data,
  showActions = true,
  showStock = false,
  onEdit,
  onDelete,
}: HardwareTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Rupture", variant: "destructive" as const };
    if (quantity < 5) return { label: "Stock bas", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Code Produit</TableHead>
            <TableHead>Nom Produit</TableHead>
            <TableHead className="w-24 text-right">Quantité</TableHead>
            {showStock && <TableHead className="w-32">Statut</TableHead>}
            <TableHead className="w-32 text-right">Prix Achat</TableHead>
            <TableHead className="w-32 text-right">Prix Vente</TableHead>
            <TableHead className="w-32 text-right">Valeur Nette</TableHead>
            <TableHead className="w-32 text-right">Valeur Totale</TableHead>
            {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? (showStock ? 9 : 8) : (showStock ? 8 : 7)}
                className="h-24 text-center text-muted-foreground"
              >
                Aucun matériel trouvé
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              // Convert to Product format if needed
              const product: Product =
                "id" in item && item.id
                  ? (item as Product)
                  : {
                      id: (item as HardwareItem).id || `temp-${item.code}`,
                      code: item.code,
                      name: item.name,
                      quantity: item.quantity,
                      purchase_price:
                        "purchase_price" in item
                          ? (item as Product).purchase_price
                          : (item as HardwareItem).buyPrice,
                      selling_price:
                        "selling_price" in item
                          ? (item as Product).selling_price
                          : (item as HardwareItem).sellPrice,
                      profit:
                        "profit" in item
                          ? (item as Product).profit
                          : (item as HardwareItem).netValue,
                      total_value:
                        "total_value" in item
                          ? (item as Product).total_value
                          : (item as HardwareItem).totalValue,
                    };

              const buyPrice =
                "purchase_price" in item
                  ? (item as Product).purchase_price
                  : (item as HardwareItem).buyPrice;
              const sellPrice =
                "selling_price" in item
                  ? (item as Product).selling_price
                  : (item as HardwareItem).sellPrice;
              const netValue =
                "profit" in item
                  ? (item as Product).profit
                  : (item as HardwareItem).netValue;
              const totalValue =
                "total_value" in item
                  ? (item as Product).total_value
                  : (item as HardwareItem).totalValue;

              const status = showStock ? getStockStatus(item.quantity) : null;
              const hasId = "id" in item && item.id && item.id.startsWith("temp-") === false;

              return (
                <TableRow key={product.id || item.code} data-testid={`row-hardware-${index}`}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  {showStock && status && (
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(buyPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sellPrice)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(netValue)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalValue)}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasId && onEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-${index}`}
                            onClick={() => onEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasId && onDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-${index}`}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Êtes-vous sûr de vouloir supprimer ce produit ?"
                                )
                              ) {
                                onDelete(product.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
