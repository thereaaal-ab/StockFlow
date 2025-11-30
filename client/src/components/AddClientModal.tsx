import { useState, useMemo, useEffect } from "react";
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
  sellingPrice: number; // Selling price (what we sell for) - can be customized for buy products
  sellingPriceDisplay: string; // String representation for input to avoid leading zeros
  rentPrice: number; // Rental price (what we charge for rent)
  type: "buy" | "rent"; // "buy" for purchase, "rent" for rental
}

export function AddClientModal() {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, SelectedProduct>>({});
  const [starterPackPrice, setStarterPackPrice] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [manualTotalSoldAmount, setManualTotalSoldAmount] = useState<string | null>(null);
  const [manualTotalMonthlyFee, setManualTotalMonthlyFee] = useState<string | null>(null);
  const [manualHardwarePrice, setManualHardwarePrice] = useState<string | null>(null);
  const [isEditingSoldAmount, setIsEditingSoldAmount] = useState(false);
  const [isEditingMonthlyFee, setIsEditingMonthlyFee] = useState(false);
  const [isEditingHardwarePrice, setIsEditingHardwarePrice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { products, updateProduct } = useProducts();
  const { createClient } = useClients();
  const { toast } = useToast();

  // Calculate totals from selected products
  // Montant d'installation = sum of prices for products where type = "buy"
  // Uses selling price if entered, otherwise purchase price (default)
  // Hardware Price = same as Montant d'installation (selling price if entered, else purchase price)
  const { installationAmount, totalMonthlyFee, totalProductQuantity, calculatedHardwarePrice } = useMemo(() => {
    let installation = 0; // Sum of prices for buy products (selling price if entered, else purchase price)
    let fee = 0;
    let qty = 0;
    let hardwarePrice = 0; // Same as installation (selling price if entered, else purchase price)

    Object.values(productDetails).forEach((detail) => {
      // Only include buy products in installation amount and hardware price
      if (detail.type === "buy") {
        // Use selling price if entered (and > 0), otherwise use purchase price
        const priceForInstallation = (detail.sellingPrice && detail.sellingPrice > 0) 
          ? detail.sellingPrice 
          : detail.purchasePrice;
        installation += priceForInstallation * detail.quantity;
        // Hardware Price uses the same price as installation
        hardwarePrice += priceForInstallation * detail.quantity;
      }
      // Monthly fee is per product, not per unit - just sum the monthlyFee values
      // Ensure monthlyFee is a valid number
      const monthlyFee = typeof detail.monthlyFee === 'number' ? detail.monthlyFee : parseFloat(String(detail.monthlyFee)) || 0;
      fee += monthlyFee; // Sum directly, do NOT multiply by quantity
      qty += detail.quantity;
    });

    return {
      installationAmount: installation,
      totalMonthlyFee: fee,
      totalProductQuantity: qty,
      calculatedHardwarePrice: hardwarePrice,
    };
  }, [productDetails]);


  // Calculate months_left automatically using new cash flow logic
  // Investment = installation costs (negative)
  // Profit One Shot = Starter pack + Hardware sell (one-time revenue)
  // If covered in first month: 0 months
  // Otherwise: 1 (first month) + additional months needed
  const monthsLeft = useMemo(() => {
    const finalInstallation = manualTotalSoldAmount !== null && manualTotalSoldAmount !== "" 
      ? parseFloat(manualTotalSoldAmount) 
      : installationAmount;
    const finalMonthlyFee = manualTotalMonthlyFee !== null && manualTotalMonthlyFee !== "" 
      ? parseFloat(manualTotalMonthlyFee) 
      : totalMonthlyFee;
    
    if (finalMonthlyFee <= 0) {
      return 0;
    }
    
    // Calculate Profit One Shot (one-time revenue: Starter pack + Hardware sell)
    const starterPack = starterPackPrice ? parseFloat(starterPackPrice) : 0;
    const finalHardwarePrice = manualHardwarePrice !== null && manualHardwarePrice !== "" 
      ? parseFloat(manualHardwarePrice) 
      : calculatedHardwarePrice;
    const hardwareSell = finalHardwarePrice || 0;
    const profitOneShot = starterPack + hardwareSell;
    
    // Net after first month: Profit One Shot + Monthly Fee - Investment
    const netMonth1 = profitOneShot + finalMonthlyFee - finalInstallation;
    
    if (netMonth1 >= 0) {
      // Covered in first month
      return 0;
    } else {
      // Not covered, need additional months
      // Remaining balance after month 1
      const remainingBalance = -netMonth1; // Positive number
      // Additional months needed: Math.ceil(remainingBalance / monthlyFee)
      // Total: 1 (first month) + additional months
      return 1 + Math.ceil(remainingBalance / finalMonthlyFee);
    }
  }, [installationAmount, totalMonthlyFee, calculatedHardwarePrice, manualTotalSoldAmount, manualTotalMonthlyFee, manualHardwarePrice, starterPackPrice]);

  // Handle product selection
  const handleProductSelectionChange = (productIds: string[]) => {
    setSelectedProductIds(productIds);

    // Initialize product details for newly selected products
    const newDetails: Record<string, SelectedProduct> = { ...productDetails };
    
    productIds.forEach((productId) => {
      if (!newDetails[productId]) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          // Auto-set monthlyFee from rent_price if product has rent_price set
          // This will be used when type is changed to "rent"
          const rentPrice = product.rent_price ?? 0;
          newDetails[productId] = {
            productId: product.id,
            name: product.name,
            quantity: 1,
            monthlyFee: 0, // Will be auto-set when type is "rent"
            monthlyFeeDisplay: "",
            stockActuel: product.stock_actuel ?? product.quantity ?? 0,
            purchasePrice: product.purchase_price,
            sellingPrice: 0, // Start with 0 so it uses purchase price by default
            sellingPriceDisplay: "", // Empty by default, will use purchase price
            rentPrice: rentPrice,
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
        // Auto-set monthly fee from rent_price when switching to "rent"
        // Clear monthly fee when switching to "buy"
        monthlyFee: type === "buy" ? 0 : (detail.monthlyFee || detail.rentPrice || 0),
        monthlyFeeDisplay: type === "buy" ? "" : (detail.monthlyFeeDisplay || String(detail.rentPrice || 0)),
        // Keep selling price when switching types
        sellingPrice: detail.sellingPrice || 0,
        sellingPriceDisplay: detail.sellingPriceDisplay || (detail.sellingPrice > 0 ? detail.sellingPrice.toString() : ""),
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

  // Update product selling price - handle string input to avoid leading zeros
  const handleSellingPriceChange = (productId: string, value: string) => {
    const detail = productDetails[productId];
    if (!detail) return;

    // Clean the input: remove any non-numeric characters except decimal point and minus
    const cleanedValue = value.replace(/[^\d.-]/g, '');
    
    // Parse to number
    const sellingPrice = cleanedValue === "" || cleanedValue === "-" ? 0 : parseFloat(cleanedValue) || 0;

    setProductDetails({
      ...productDetails,
      [productId]: {
        ...detail,
        sellingPrice: Math.max(0, sellingPrice),
        sellingPriceDisplay: cleanedValue,
      },
    });
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

    // Use manual values for validation if provided
    const finalInstallationAmount = manualTotalSoldAmount !== null && manualTotalSoldAmount !== "" 
      ? parseFloat(manualTotalSoldAmount) 
      : installationAmount;
    const finalTotalMonthlyFee = manualTotalMonthlyFee !== null && manualTotalMonthlyFee !== "" 
      ? parseFloat(manualTotalMonthlyFee) 
      : totalMonthlyFee;

    // Validation: months_left must be >= 1
    const finalMonthsLeft = finalTotalMonthlyFee > 0 ? Math.ceil(finalInstallationAmount / finalTotalMonthlyFee) : monthsLeft;
    if (finalTotalMonthlyFee > 0 && finalMonthsLeft < 1) {
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
          : (detail.sellingPrice || product?.selling_price || 0); // Client pays selling price when buying (customizable)

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

      // Use manually entered values if provided, otherwise use calculated values
      const finalInstallationAmount = manualTotalSoldAmount !== null && manualTotalSoldAmount !== "" 
        ? parseFloat(manualTotalSoldAmount) 
        : installationAmount;
      const finalTotalMonthlyFee = manualTotalMonthlyFee !== null && manualTotalMonthlyFee !== "" 
        ? parseFloat(manualTotalMonthlyFee) 
        : totalMonthlyFee;
      const finalMonthsLeft = finalTotalMonthlyFee > 0 ? Math.ceil(finalInstallationAmount / finalTotalMonthlyFee) : monthsLeft;

      // Use manually entered hardware price if provided, otherwise use calculated value
      const finalHardwarePrice = manualHardwarePrice !== null && manualHardwarePrice !== "" 
        ? parseFloat(manualHardwarePrice) 
        : calculatedHardwarePrice;

      // Create client
      await createClient({
        client_name: clientName.trim(),
        product_quantity: totalProductQuantity,
        total_sold_amount: finalInstallationAmount, // Store as total_sold_amount in DB (backward compatibility)
        monthly_fee: finalTotalMonthlyFee,
        months_left: finalMonthsLeft,
        products: clientProducts,
        starter_pack_price: starterPackPrice ? parseFloat(starterPackPrice) : undefined,
        hardware_price: finalHardwarePrice > 0 ? finalHardwarePrice : undefined,
        contract_start_date: contractStartDate || undefined,
        status: "active",
      });

      // Update stock_actuel for each product
      // When a client buys products (type = "buy"), add quantity to hardware_total
      for (const detail of Object.values(productDetails)) {
        const product = products.find((p) => p.id === detail.productId);
        if (product) {
          // Check stock availability one more time before updating
          if (product.stock_actuel < detail.quantity) {
            throw new Error(`Not enough stock available for product ${product.name}. Available: ${product.stock_actuel}, Requested: ${detail.quantity}`);
          }
          
          const newStockActuel = product.stock_actuel - detail.quantity;
          const newTotalValue = newStockActuel * product.purchase_price;
          
          // If client is buying (not renting), add quantity to hardware_total
          const newHardwareTotal = detail.type === "buy" 
            ? (product.hardware_total ?? product.quantity ?? 0) + detail.quantity
            : (product.hardware_total ?? product.quantity ?? 0);
          
          await updateProduct({
            ...product,
            stock_actuel: newStockActuel,
            quantity: newStockActuel, // Keep quantity in sync for backward compatibility
            total_value: newTotalValue,
            hardware_total: newHardwareTotal,
          });
        }
      }
      
      // Reset form
      setOpen(false);
      setClientName("");
      setSelectedProductIds([]);
      setProductDetails({});
      setStarterPackPrice("");
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
      setManualTotalSoldAmount(null);
      setManualTotalMonthlyFee(null);
      setManualHardwarePrice(null);
      setIsEditingSoldAmount(false);
      setIsEditingMonthlyFee(false);
      setIsEditingHardwarePrice(false);
      setSelectedProductIds([]);
      setProductDetails({});
      setStarterPackPrice("");
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
                            <Label className="text-xs">Type</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={detail.type === "buy" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeChange(product.id, "buy")}
                                disabled={isSaving}
                                className={detail.type === "buy" ? "" : "opacity-60 hover:opacity-80"}
                              >
                                Acheter
                              </Button>
                              <Button
                                type="button"
                                variant={detail.type === "rent" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeChange(product.id, "rent")}
                                disabled={isSaving}
                                className={detail.type === "rent" ? "" : "opacity-60 hover:opacity-80"}
                              >
                                Louer
                              </Button>
                            </div>
                          </div>
                          <div className={detail.type === "rent" ? "grid grid-cols-2 gap-3" : (detail.type === "buy" ? "grid grid-cols-2 gap-3" : "space-y-1")}>
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
                          {detail.type === "rent" && (
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
                          )}
                          {detail.type === "buy" && (
                            <div className="space-y-1">
                              <Label htmlFor={`selling_price_${product.id}`} className="text-xs">
                                Prix de Vente (€)
                              </Label>
                              <Input
                                id={`selling_price_${product.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={detail.sellingPriceDisplay ?? (detail.sellingPrice === 0 ? "" : detail.sellingPrice.toString())}
                                onChange={(e) =>
                                    handleSellingPriceChange(product.id, e.target.value)
                                }
                                disabled={isSaving}
                                placeholder={`Par défaut: ${product.purchase_price.toFixed(2)}€ (prix d'achat)`}
                              />
                              <p className="text-xs text-muted-foreground">
                                {detail.sellingPrice && detail.sellingPrice > 0 
                                  ? `Utilisé: ${detail.sellingPrice.toFixed(2)}€` 
                                  : `Par défaut: ${product.purchase_price.toFixed(2)}€ (prix d'achat)`}
                              </p>
                            </div>
                          )}
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
                <Label htmlFor="installation_amount">Montant d'installation (€)</Label>
                <Input
                  id="installation_amount"
                  type="number"
                  step="0.01"
                  value={isEditingSoldAmount || manualTotalSoldAmount !== null 
                    ? (manualTotalSoldAmount || "") 
                    : installationAmount.toFixed(2)}
                  onChange={(e) => {
                    setIsEditingSoldAmount(true);
                    setManualTotalSoldAmount(e.target.value);
                  }}
                  onBlur={() => {
                    setIsEditingSoldAmount(false);
                    // If empty after blur, revert to calculated
                    if (manualTotalSoldAmount === "") {
                      setManualTotalSoldAmount(null);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-muted"
                  data-testid="input-installation-amount"
                />
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
                  value={isEditingMonthlyFee || manualTotalMonthlyFee !== null 
                    ? (manualTotalMonthlyFee || "") 
                    : totalMonthlyFee.toFixed(2)}
                  onChange={(e) => {
                    setIsEditingMonthlyFee(true);
                    setManualTotalMonthlyFee(e.target.value);
                  }}
                  onBlur={() => {
                    setIsEditingMonthlyFee(false);
                    // If empty after blur, revert to calculated
                    if (manualTotalMonthlyFee === "") {
                      setManualTotalMonthlyFee(null);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-muted"
                  data-testid="input-monthly-fee"
                />
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
                  value={isEditingHardwarePrice || manualHardwarePrice !== null 
                    ? (manualHardwarePrice || "") 
                    : calculatedHardwarePrice.toFixed(2)}
                  onChange={(e) => {
                    setIsEditingHardwarePrice(true);
                    setManualHardwarePrice(e.target.value);
                  }}
                  onBlur={() => {
                    setIsEditingHardwarePrice(false);
                    // If empty after blur, revert to calculated
                    if (manualHardwarePrice === "") {
                      setManualHardwarePrice(null);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-muted"
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
