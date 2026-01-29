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
import { useCategories } from "@/hooks/useCategories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemo, useState } from "react";

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
  showHardwareTotal?: boolean; // If true, show hardware_total instead of stock_actuel
  showCategory?: boolean;
  enableInlineCategoryEdit?: boolean;
  enableInlineQuantityEdit?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onUpdateCategory?: (
    product: Product,
    categoryId?: string,
    categoryName?: string
  ) => Promise<void> | void;
  onUpdateQuantity?: (product: Product, quantity: number) => Promise<void> | void;
}

export function HardwareTable({
  data,
  showActions = true,
  showStock = false,
  showHardwareTotal = false, // Default to showing stock_actuel
  showCategory = true,
  enableInlineCategoryEdit = false,
  enableInlineQuantityEdit = false,
  onEdit,
  onDelete,
  onUpdateCategory,
  onUpdateQuantity,
}: HardwareTableProps) {
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const [updatingQuantityId, setUpdatingQuantityId] = useState<string | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const categoriesById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStockStatus = (stockActuel: number) => {
    if (stockActuel === 0) return { label: "Rupture", variant: "destructive" as const };
    if (stockActuel < 5) return { label: "Stock bas", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  const columnCount =
    7 +
    (showCategory ? 1 : 0) +
    (showStock ? 1 : 0) +
    (showActions ? 1 : 0);

  const handleCategoryChange = async (product: Product, value: string) => {
    if (!onUpdateCategory) return;
    const selectedCategory = categories.find((category) => category.id === value);
    setUpdatingCategoryId(product.id);
    try {
      await onUpdateCategory(
        product,
        value || undefined,
        selectedCategory?.name || product.category
      );
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  const handleQuantityCommit = async (product: Product, rawValue: string) => {
    if (!onUpdateQuantity) return;
    const nextQuantity = parseInt(rawValue, 10);
    const currentBaseQuantity = showHardwareTotal
      ? product.hardware_total ?? product.quantity
      : product.stock_actuel ?? product.quantity;

    if (Number.isNaN(nextQuantity)) {
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }
    if (nextQuantity === currentBaseQuantity) {
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }
    setUpdatingQuantityId(product.id);
    try {
      await onUpdateQuantity(product, nextQuantity);
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Erreur lors de la mise à jour de la quantité");
    } finally {
      setUpdatingQuantityId(null);
    }
  };

  return (
    <div className="rounded-md border">
      <TooltipProvider delayDuration={150}>
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom Produit</TableHead>
            {showCategory && <TableHead className="w-64">Catégorie</TableHead>}
            <TableHead className="w-24 text-right">Quantité</TableHead>
            {showStock && <TableHead className="w-32">Statut</TableHead>}
            <TableHead className="w-32 text-right">Prix Achat</TableHead>
            <TableHead className="w-32 text-right">Prix Vente</TableHead>
            <TableHead className="w-32 text-right">Prix Location</TableHead>
            <TableHead className="w-32 text-right">Valeur Nette</TableHead>
            <TableHead className="w-32 text-right">Valeur Totale</TableHead>
            {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
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
                      quantity: item.quantity, // Keep for backward compatibility
                      hardware_total: "hardware_total" in item ? item.hardware_total : item.quantity,
                      stock_actuel: "stock_actuel" in item ? item.stock_actuel : item.quantity,
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
                      category: "category" in item ? (item as Product).category : "Other",
                      category_id: "category_id" in item ? (item as Product).category_id : undefined,
                    };

              const buyPrice =
                "purchase_price" in item
                  ? (item as Product).purchase_price
                  : (item as HardwareItem).buyPrice;
              const sellPrice =
                "selling_price" in item
                  ? (item as Product).selling_price
                  : (item as HardwareItem).sellPrice;
              const rentPrice =
                "rent_price" in item
                  ? (item as Product).rent_price
                  : 0;
              const netValue =
                "profit" in item
                  ? (item as Product).profit
                  : (item as HardwareItem).netValue;
              const totalValue =
                "total_value" in item
                  ? (item as Product).total_value
                  : (item as HardwareItem).totalValue;

              // Determine which quantity to display
              // If showHardwareTotal is true, show hardware_total (original quantity that never changes)
              // Otherwise, show stock_actuel (current available stock)
              const hardwareTotal = "hardware_total" in item && item.hardware_total !== undefined 
                ? item.hardware_total 
                : item.quantity;
              const stockActuel = "stock_actuel" in item && item.stock_actuel !== undefined 
                ? item.stock_actuel 
                : item.quantity;
              
              // Display quantity based on context
              const displayQuantity = showHardwareTotal ? hardwareTotal : stockActuel;
              const status = showStock ? getStockStatus(stockActuel) : null;
              const hasId = "id" in item && item.id && item.id.startsWith("temp-") === false;
              const categoryName =
                (product.category_id && categoriesById.get(product.category_id)) ||
                product.category ||
                "Non spécifiée";

              return (
                <TableRow key={product.id || item.code} data-testid={`row-hardware-${index}`}>
                  <TableCell className="font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{item.name}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="font-mono text-sm">{item.code}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  {showCategory && (
                    <TableCell className="w-48">
                      {enableInlineCategoryEdit && onUpdateCategory ? (
                        categoriesLoading ? (
                          <span className="text-muted-foreground text-sm">
                            Chargement...
                          </span>
                        ) : categories.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            Aucune catégorie
                          </span>
                        ) : (
                          <Select
                            value={product.category_id || ""}
                            onValueChange={(value) => handleCategoryChange(product, value)}
                            disabled={updatingCategoryId === product.id}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name.charAt(0).toUpperCase() +
                                    category.name.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      ) : (
                        <span>{categoryName}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {enableInlineQuantityEdit && onUpdateQuantity && hasId ? (
                      <input
                        type="number"
                        min="0"
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right text-sm text-foreground shadow-sm"
                        value={
                          quantityDrafts[product.id] !== undefined
                            ? quantityDrafts[product.id]
                            : String(displayQuantity)
                        }
                        onChange={(event) =>
                          setQuantityDrafts((prev) => ({
                            ...prev,
                            [product.id]: event.target.value,
                          }))
                        }
                        onBlur={(event) => handleQuantityCommit(product, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            (event.target as HTMLInputElement).blur();
                          }
                        }}
                        disabled={updatingQuantityId === product.id}
                      />
                    ) : (
                      displayQuantity
                    )}
                  </TableCell>
                  {showStock && status && (
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(buyPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sellPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(rentPrice)}</TableCell>
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
      </TooltipProvider>
    </div>
  );
}
