import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useClients, ClientProduct } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { ProductMultiSelect } from "@/components/ProductMultiSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SelectedProduct {
  productId: string;
  name: string;
  quantity: number;
  monthlyFee: number;
  monthlyFeeDisplay: string; // String representation for input to avoid leading zeros
  stockActuel: number; // Current available stock
  purchasePrice: number; // Purchase price (what we paid)
  sellingPrice: number; // Selling price (what we sell for)
  rentPrice: number; // Rental price (what we charge for rent)
  type: "buy" | "rent"; // "buy" for purchase, "rent" for rental
}

export function AddClientModal() {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, SelectedProduct>>({});
  const [starterPackPrice, setStarterPackPrice] = useState("");
  const [hardwarePrice, setHardwarePrice] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { products, updateProduct } = useProducts();
  const { createClient } = useClients();
  const { toast } = useToast();

  // Calculate totals from selected products
  const { totalSoldAmount, totalMonthlyFee, totalProductQuantity } = useMemo(() => {
    let sold = 0;
    let fee = 0;
    let qty = 0;

    Object.values(productDetails).forEach((detail) => {
      // Use purchase_price for buy (what we paid), rent_price for rent
      const price = detail.type === "rent" ? detail.rentPrice : detail.purchasePrice;
      sold += price * detail.quantity;
      fee += detail.monthlyFee;
      qty += detail.quantity;
    });

    return {
      totalSoldAmount: sold,
      totalMonthlyFee: fee,
      totalProductQuantity: qty,
    };
  }, [productDetails]);

  // Calculate months_left automatically
  const monthsLeft = useMemo(() => {
    if (totalMonthlyFee > 0) {
      return Math.ceil(totalSoldAmount / totalMonthlyFee);
    }
    return 0;
  }, [totalSoldAmount, totalMonthlyFee]);

  // Handle product selection
  const handleProductSelectionChange = (productIds: string[]) => {
    setSelectedProductIds(productIds);

    // Initialize product details for newly selected products
    const newDetails: Record<string, SelectedProduct> = { ...productDetails };
    
    productIds.forEach((productId) => {
      if (!newDetails[productId]) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          newDetails[productId] = {
            productId: product.id,
            name: product.name,
            quantity: 1,
            monthlyFee: 0,
            monthlyFeeDisplay: "",
            stockActuel: product.stock_actuel ?? product.quantity ?? 0,
            purchasePrice: product.purchase_price,
            sellingPrice: product.selling_price,
            rentPrice: product.rent_price ?? 0,
            type: "buy", // Default to buy
          };
        }
      }
    });

    // Remove details for unselected products
    Object.keys(newDetails).forEach((productId) => {
      if (!productIds.includes(productId)) {
        delete newDetails[productId];
      }
    });

    setProductDetails(newDetails);
    
    // Clear errors when selection changes
    setErrors({});
  };

  // Handle product type change (buy/rent)
  const handleTypeChange = (productId: string, type: "buy" | "rent") => {
    const detail = productDetails[productId];
    if (!detail) return;

    setProductDetails({
      ...productDetails,
      [productId]: {
        ...detail,
        type,
      },
    });
  };

  // Update product quantity - allow any input, validate on submit
  const handleQuantityChange = (productId: string, value: string) => {
    const detail = productDetails[productId];
    if (!detail) return;

    // Allow empty string or any number, convert to number for storage
    const quantity = value === "" ? 0 : parseInt(value, 10) || 0;

    const newDetails = {
      ...productDetails,
      [productId]: {
        ...detail,
        quantity: quantity,
      },
    };

    setProductDetails(newDetails);
    
    // Clear error for this product
    if (errors[`quantity_${productId}`]) {
      const newErrors = { ...errors };
      delete newErrors[`quantity_${productId}`];
      setErrors(newErrors);
    }
  };

  // Update product monthly fee - handle string input to avoid leading zeros
  const handleMonthlyFeeChange = (productId: string, value: string) => {
    const detail = productDetails[productId];
    if (!detail) return;

    // Remove leading zeros (but allow "0" or "0.xx")
    let cleanedValue = value;
    if (cleanedValue.length > 1 && cleanedValue.startsWith('0') && !cleanedValue.startsWith('0.')) {
      cleanedValue = cleanedValue.replace(/^0+/, '') || '0';
    }
    
    const monthlyFee = cleanedValue === "" || cleanedValue === "-" ? 0 : parseFloat(cleanedValue) || 0;

    setProductDetails({
      ...productDetails,
      [productId]: {
        ...detail,
        monthlyFee: Math.max(0, monthlyFee),
        monthlyFeeDisplay: cleanedValue,
      },
    });
  };

  // Remove product
  const handleRemoveProduct = (productId: string) => {
    const newIds = selectedProductIds.filter((id) => id !== productId);
    setSelectedProductIds(newIds);
    
    const newDetails = { ...productDetails };
    delete newDetails[productId];
    setProductDetails(newDetails);

    // Clear errors for this product
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(`${productId}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientName.trim()) {
      newErrors.client_name = "Le nom du client est requis";
    }

    if (selectedProductIds.length === 0) {
      newErrors.products = "Veuillez sélectionner au moins un produit";
    }

    // Validate each product's quantity against stock_actuel
    Object.values(productDetails).forEach((detail) => {
      if (detail.quantity > detail.stockActuel) {
        newErrors[`quantity_${detail.productId}`] = `Not enough stock available for this product. Available: ${detail.stockActuel}, Requested: ${detail.quantity}`;
      }
      if (detail.quantity < 1) {
        newErrors[`quantity_${detail.productId}`] = "La quantité doit être au moins 1";
      }
    });

    // Validation: total_sold_amount must be >= totalMonthlyFee
    if (totalSoldAmount > 0 && totalMonthlyFee > 0 && totalSoldAmount < totalMonthlyFee) {
      newErrors.total_sold_amount = "Le montant total vendu doit être supérieur ou égal aux frais mensuels totaux";
    }

    // Validation: months_left must be >= 1
    if (totalMonthlyFee > 0 && monthsLeft < 1) {
      newErrors.months_left = "Le nombre de mois restants doit être supérieur ou égal à 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      // Prepare products array for client
      // When creating a new client, all products are added in month 1
      const now = new Date().toISOString();
      const clientProducts: ClientProduct[] = Object.values(productDetails).map((detail) => {
        const product = products.find((p) => p.id === detail.productId);
        const purchasePrice = product?.purchase_price || 0;
        const clientPrice = detail.type === "rent" 
          ? (product?.rent_price || 0)
          : (product?.purchase_price || 0); // Client pays purchase price when buying

        return {
          productId: detail.productId,
          name: detail.name,
          quantity: detail.quantity,
          monthlyFee: detail.monthlyFee,
          type: detail.type || "buy",
          addedAt: now, // All products added in month 1 for new clients
          purchasePrice,
          clientPrice,
        };
      });

      // Create client
      await createClient({
        client_name: clientName.trim(),
        product_quantity: totalProductQuantity,
        total_sold_amount: totalSoldAmount,
        monthly_fee: totalMonthlyFee,
        months_left: monthsLeft,
        products: clientProducts,
        starter_pack_price: starterPackPrice ? parseFloat(starterPackPrice) : undefined,
        hardware_price: hardwarePrice ? parseFloat(hardwarePrice) : undefined,
        contract_start_date: contractStartDate || undefined,
        status: "active",
      });

      // Update stock_actuel for each product (do not change hardware_total)
      for (const detail of Object.values(productDetails)) {
        const product = products.find((p) => p.id === detail.productId);
        if (product) {
          // Check stock availability one more time before updating
          if (product.stock_actuel < detail.quantity) {
            throw new Error(`Not enough stock available for product ${product.name}. Available: ${product.stock_actuel}, Requested: ${detail.quantity}`);
          }
          
          const newStockActuel = product.stock_actuel - detail.quantity;
          const newTotalValue = newStockActuel * product.purchase_price;
          
          await updateProduct({
            ...product,
            stock_actuel: newStockActuel,
            quantity: newStockActuel, // Keep quantity in sync for backward compatibility
            total_value: newTotalValue,
            // hardware_total remains unchanged
          });
        }
      }
      
      // Reset form
      setOpen(false);
      setClientName("");
      setSelectedProductIds([]);
      setProductDetails({});
      setStarterPackPrice("");
      setHardwarePrice("");
      setErrors({});
      
      toast({
        title: "Client ajouté avec succès!",
        description: "Le client a été ajouté et les stocks ont été mis à jour.",
      });
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage = error?.message || "Erreur lors de l'ajout du client. Veuillez réessayer.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setClientName("");
      setSelectedProductIds([]);
      setProductDetails({});
      setStarterPackPrice("");
      setHardwarePrice("");
      setContractStartDate("");
      setErrors({});
    }
  };

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau client</DialogTitle>
            <DialogDescription>
              Sélectionnez les produits et remplissez les informations du nouveau client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nom du Client</Label>
              <Input
                id="client_name"
                placeholder="Nom du client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                data-testid="input-client-name"
                required
              />
              {errors.client_name && (
                <p className="text-sm text-destructive">{errors.client_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Produits</Label>
              <ProductMultiSelect
                products={products}
                selectedProductIds={selectedProductIds}
                onSelectionChange={handleProductSelectionChange}
                disabled={isSaving}
              />
              {errors.products && (
                <p className="text-sm text-destructive">{errors.products}</p>
              )}
            </div>

            {selectedProducts.length > 0 && (
              <div className="space-y-3">
                <Label>Détails des produits sélectionnés</Label>
                {selectedProducts.map((product) => {
                  const detail = productDetails[product.id];
                  if (!detail) return null;

                  return (
                    <Card key={product.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{detail.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Stock disponible: {detail.stockActuel} • Prix d'achat: {detail.purchasePrice.toFixed(2)}€
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(product.id)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Separator className="mb-3" />
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor={`type_${product.id}`} className="text-xs">
                              Type
                            </Label>
                            <Select
                              value={detail.type}
                              onValueChange={(value: "buy" | "rent") =>
                                handleTypeChange(product.id, value)
                              }
                              disabled={isSaving}
                            >
                              <SelectTrigger id={`type_${product.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="buy">
                                  Acheter ({detail.purchasePrice.toFixed(2)}€)
                                </SelectItem>
                                <SelectItem value="rent">
                                  Louer ({detail.rentPrice.toFixed(2)}€)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`quantity_${product.id}`} className="text-xs">
                                Quantité
                              </Label>
                              <Input
                                id={`quantity_${product.id}`}
                                type="number"
                                min="0"
                                value={detail.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(product.id, e.target.value)
                                }
                                disabled={isSaving}
                              />
                              {errors[`quantity_${product.id}`] && (
                                <p className="text-xs text-destructive">
                                  {errors[`quantity_${product.id}`]}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`fee_${product.id}`} className="text-xs">
                                Frais Mensuels (€)
                              </Label>
                              <Input
                                id={`fee_${product.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={detail.monthlyFeeDisplay ?? (detail.monthlyFee === 0 ? "" : detail.monthlyFee.toString())}
                                onChange={(e) =>
                                  handleMonthlyFeeChange(product.id, e.target.value)
                                }
                                disabled={isSaving}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_sold_amount">Montant Total Vendu (€)</Label>
                <Input
                  id="total_sold_amount"
                  type="number"
                  step="0.01"
                  value={totalSoldAmount.toFixed(2)}
                  disabled
                  className="bg-muted"
                  data-testid="input-total-sold"
                />
                <p className="text-xs text-muted-foreground">
                  Calculé automatiquement
                </p>
                {errors.total_sold_amount && (
                  <p className="text-sm text-destructive">{errors.total_sold_amount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Frais Mensuels Totaux (€)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  step="0.01"
                  value={totalMonthlyFee.toFixed(2)}
                  disabled
                  className="bg-muted"
                  data-testid="input-monthly-fee"
                />
                <p className="text-xs text-muted-foreground">
                  Somme des frais mensuels
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starter_pack_price">Starter Pack Price (€)</Label>
                <Input
                  id="starter_pack_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={starterPackPrice}
                  onChange={(e) => setStarterPackPrice(e.target.value)}
                  disabled={isSaving}
                  data-testid="input-starter-pack-price"
                />
                {errors.starter_pack_price && (
                  <p className="text-sm text-destructive">{errors.starter_pack_price}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hardware_price">Hardware Price (€)</Label>
                <Input
                  id="hardware_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={hardwarePrice}
                  onChange={(e) => setHardwarePrice(e.target.value)}
                  disabled={isSaving}
                  data-testid="input-hardware-price"
                />
                {errors.hardware_price && (
                  <p className="text-sm text-destructive">{errors.hardware_price}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_start_date">Date de Début du Contrat</Label>
              <Input
                id="contract_start_date"
                type="date"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                disabled={isSaving}
                data-testid="input-contract-start-date"
              />
              <p className="text-xs text-muted-foreground">
                Date à laquelle le contrat avec le client a commencé
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="months_left">Mois Restants</Label>
              <Input
                id="months_left"
                type="number"
                value={monthsLeft}
                disabled
                className="bg-muted"
                data-testid="input-months-left"
              />
              <p className="text-xs text-muted-foreground">
                Calculé automatiquement: {monthsLeft} {monthsLeft === 1 ? "mois" : "mois"}
              </p>
              {errors.months_left && (
                <p className="text-sm text-destructive">{errors.months_left}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              data-testid="button-cancel"
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button type="submit" data-testid="button-submit" disabled={isSaving}>
              {isSaving ? "Ajout en cours..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
