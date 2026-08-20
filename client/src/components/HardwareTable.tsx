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
import { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

interface HardwareItem {
  code: string;
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  rentPrice?: number;
  netValue: number;
  totalValue: number;
  id?: string;
}

interface HardwareTableProps {
  data: (HardwareItem | Product)[];
  showActions?: boolean;
  showStock?: boolean;
  showHardwareTotal?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export function HardwareTable({
  data,
  showActions = true,
  showStock = false,
  showHardwareTotal = false,
  onEdit,
  onDelete,
}: HardwareTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStockStatus = (stockActuel: number) => {
    if (stockActuel === 0) return { label: "Rupture", tone: "danger" as const };
    if (stockActuel < 5) return { label: "Stock bas", tone: "warning" as const };
    return { label: "En stock", tone: "success" as const };
  };

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-card">
      <div className="max-h-[min(70vh,720px)] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="table-head-enterprise">Code Produit</TableHead>
              <TableHead className="table-head-enterprise">Nom Produit</TableHead>
              <TableHead className="table-head-enterprise text-right">Quantité</TableHead>
              {showStock && (
                <TableHead className="table-head-enterprise">Statut</TableHead>
              )}
              <TableHead className="table-head-enterprise text-right">Prix Achat</TableHead>
              <TableHead className="table-head-enterprise text-right">Prix Vente</TableHead>
              <TableHead className="table-head-enterprise text-right">Prix Location</TableHead>
              <TableHead className="table-head-enterprise text-right">Valeur Nette</TableHead>
              <TableHead className="table-head-enterprise text-right">Valeur Totale</TableHead>
              {showActions && (
                <TableHead className="table-head-enterprise w-24 text-right">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell
                  colSpan={showActions ? (showStock ? 10 : 9) : showStock ? 9 : 8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun matériel trouvé
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => {
                const product: Product =
                  "id" in item && item.id
                    ? (item as Product)
                    : {
                        id: (item as HardwareItem).id || `temp-${item.code}`,
                        code: item.code,
                        name: item.name,
                        quantity: item.quantity,
                        hardware_total:
                          "hardware_total" in item ? item.hardware_total : item.quantity,
                        stock_actuel:
                          "stock_actuel" in item ? item.stock_actuel : item.quantity,
                        purchase_price:
                          "purchase_price" in item
                            ? (item as Product).purchase_price
                            : (item as HardwareItem).buyPrice,
                        selling_price:
                          "selling_price" in item
                            ? (item as Product).selling_price
                            : (item as HardwareItem).sellPrice,
                        rent_price:
                          "rent_price" in item
                            ? (item as Product).rent_price
                            : (item as HardwareItem).rentPrice || 0,
                        profit:
                          "profit" in item
                            ? (item as Product).profit
                            : (item as HardwareItem).netValue,
                        total_value:
                          "total_value" in item
                            ? (item as Product).total_value
                            : (item as HardwareItem).totalValue,
                        category:
                          "category" in item ? (item as Product).category : "Other",
                        category_id:
                          "category_id" in item
                            ? (item as Product).category_id
                            : undefined,
                    } as Product;

                const buyPrice =
                  "purchase_price" in item
                    ? (item as Product).purchase_price
                    : (item as HardwareItem).buyPrice;
                const sellPrice =
                  "selling_price" in item
                    ? (item as Product).selling_price
                    : (item as HardwareItem).sellPrice;
                const rentPrice =
                  "rent_price" in item ? (item as Product).rent_price : 0;
                const netValue =
                  "profit" in item
                    ? (item as Product).profit
                    : (item as HardwareItem).netValue;
                const totalValue =
                  "total_value" in item
                    ? (item as Product).total_value
                    : (item as HardwareItem).totalValue;

                const hardwareTotal =
                  "hardware_total" in item && item.hardware_total !== undefined
                    ? item.hardware_total
                    : item.quantity;
                const stockActuel =
                  "stock_actuel" in item && item.stock_actuel !== undefined
                    ? item.stock_actuel
                    : item.quantity;

                const displayQuantity = showHardwareTotal ? hardwareTotal : stockActuel;
                const status = showStock ? getStockStatus(stockActuel) : null;
                const hasId =
                  "id" in item && item.id && item.id.startsWith("temp-") === false;

                return (
                  <TableRow
                    key={product.id || item.code}
                    data-testid={`row-hardware-${index}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className={cn(
                      "group/row h-[52px] border-border/80 animate-table-row border-b transition-colors duration-150",
                      "even:bg-white/[0.015] hover:bg-muted/30"
                    )}
                  >
                    <TableCell className="h-[52px] max-w-[200px] py-2 align-middle">
                      <span className="code-pill">{item.code}</span>
                    </TableCell>
                    <TableCell className="h-[52px] py-2 align-middle font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell className="h-[52px] py-2 text-right align-middle tabular-nums">
                      {displayQuantity}
                    </TableCell>
                    {showStock && status && (
                      <TableCell className="h-[52px] py-2 align-middle">
                        {/* Badge R0 : pill mono, uppercase, couleur de feedback. */}
                        <span
                          className={cn(
                            "ro-badge py-1",
                            status.tone === "success" && "ro-badge-success",
                            status.tone === "warning" && "ro-badge-warning",
                            status.tone === "danger" && "ro-badge-error"
                          )}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-current"
                            aria-hidden
                          />
                          {status.label}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="h-[52px] py-2 text-right align-middle tabular-nums">
                      {formatCurrency(buyPrice)}
                    </TableCell>
                    <TableCell className="h-[52px] py-2 text-right align-middle tabular-nums">
                      {formatCurrency(sellPrice)}
                    </TableCell>
                    <TableCell className="h-[52px] py-2 text-right align-middle tabular-nums">
                      {formatCurrency(rentPrice)}
                    </TableCell>
                    <TableCell className="h-[52px] py-2 text-right align-middle font-medium tabular-nums">
                      {formatCurrency(netValue)}
                    </TableCell>
                    <TableCell className="h-[52px] py-2 text-right align-middle font-medium tabular-nums">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    {showActions && (
                      <TableCell className="h-[52px] py-2 text-right align-middle">
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1 transition-opacity duration-150",
                            "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100"
                          )}
                        >
                          {hasId && onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 rounded-lg border border-transparent hover:border-border hover:bg-muted/50"
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
                              className="size-8 rounded-lg border border-transparent hover:border-border hover:bg-muted/50"
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
                              <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}
