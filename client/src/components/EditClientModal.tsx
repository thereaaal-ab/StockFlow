import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Trash2 } from "lucide-react";
import { useClients, Client, ClientProduct } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { ProductMultiSelect } from "@/components/ProductMultiSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { calculateTotalMonthlyFeeFromProducts } from "@/lib/clientCalculations";

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
  originalQuantity: number; // Original quantity from client (for stock calculation)
  originalType: "buy" | "rent"; // Original type from client (for hardware_total calculation)
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function EditClientModal({
  open,
  onOpenChange,
  client,
}: EditClientModalProps) {
  const [clientName, setClientName] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, SelectedProduct>>({});
  const [starterPackPrice, setStarterPackPrice] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [manualTotalSoldAmount, setManualTotalSoldAmount] = useState<string | null>(null);
  const [manualTotalMonthlyFee, setManualTotalMonthlyFee] = useState<string | null>(null);
  const [manualHardwarePrice, setManualHardwarePrice] = useState<string | null>(null);
  const [isEditingSoldAmount, setIsEditingSoldAmount] = useState(false);
  const [isEditingMonthlyFee, setIsEditingMonthlyFee] = useState(false);
  const [isEditingHardwarePrice, setIsEditingHardwarePrice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { products, updateProduct } = useProducts();
  const { updateClient } = useClients();
  const { toast } = useToast();

  // Initialize form data when client changes
  useEffect(() => {
    if (client && open) {
      setClientName(client.client_name || "");
      setStarterPackPrice(client.starter_pack_price?.toString() || "");
      setContractStartDate(client.contract_start_date ? client.contract_start_date.split('T')[0] : "");
      setStatus((client.status as "active" | "inactive") || "active");
      
      // Calculate total monthly fee from products to determine if monthly_fee was manually set
      const calculatedMonthlyFee = calculateTotalMonthlyFeeFromProducts(client);
      const clientMonthlyFee = client.monthly_fee || 0;
      
      // Only set manualTotalMonthlyFee if it's different from calculated value (meaning it was manually set)
      // If they're the same or client.monthly_fee is 0, use null to show calculated value
      const isManualMonthlyFee = clientMonthlyFee > 0 && Math.abs(clientMonthlyFee - calculatedMonthlyFee) > 0.01;
      
      // Initialize manual values with saved client values (they will be displayed in the inputs)
      // The inputs will show these values, and if user edits them, they'll be saved
      setManualTotalSoldAmount(client.total_sold_amount?.toString() || null);
      setManualTotalMonthlyFee(isManualMonthlyFee ? client.monthly_fee?.toString() || null : null);
      // Initialize hardware price - if client has a saved value, use it; otherwise it will be calculated
      setManualHardwarePrice(client.hardware_price?.toString() || null);
      setIsEditingSoldAmount(false);
      setIsEditingMonthlyFee(false);
      setIsEditingHardwarePrice(false);
      setErrors({});

      // Initialize products from client
      if (client.products && client.products.length > 0) {
        const productIds: string[] = [];
        const details: Record<string, SelectedProduct> = {};

        client.products.forEach((clientProduct) => {
          const product = products.find((p) => p.id === clientProduct.productId);
          if (product) {
            productIds.push(product.id);
            details[product.id] = {
              productId: product.id,
              name: product.name,
              quantity: clientProduct.quantity,
              monthlyFee: clientProduct.monthlyFee,
              monthlyFeeDisplay: clientProduct.monthlyFee === 0 ? "" : clientProduct.monthlyFee.toString(),
              stockActuel: product.stock_actuel ?? product.quantity ?? 0,
              purchasePrice: product.purchase_price,
              sellingPrice: product.selling_price,
              rentPrice: product.rent_price ?? 0,
              type: clientProduct.type || "buy", // Default to buy if not specified
              originalQuantity: clientProduct.quantity, // Store original for stock calculation
              originalType: clientProduct.type || "buy", // Store original type for hardware_total calculation
            };
          }
        });

        setSelectedProductIds(productIds);
        setProductDetails(details);
      } else {
        setSelectedProductIds([]);
        setProductDetails({});
      }
    }
  }, [client, open, products]);

  // Calculate totals from selected products
  // Montant d'installation = sum of purchase prices for products where type = "buy" (what we paid)
  // Hardware Price = sum of purchase prices for products where type = "buy" (what client pays)
  const { installationAmount, totalMonthlyFee, totalProductQuantity, calculatedHardwarePrice } = useMemo(() => {
    let installation = 0; // Sum of purchase prices for buy products (what we invested)
    let fee = 0;
    let qty = 0;
    let hardwarePrice = 0; // Sum of purchase prices for buy products (what client pays)

    Object.values(productDetails).forEach((detail) => {
      // Only include buy products in installation amount and hardware price
      if (detail.type === "buy") {
        installation += detail.purchasePrice * detail.quantity;
        hardwarePrice += detail.purchasePrice * detail.quantity;
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
  // Profit One Shot = Starter pack + Hardware sell + Monthly fee (first month)
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
    
    // Calculate Profit One Shot (first month benefits)
    const starterPack = starterPackPrice ? parseFloat(starterPackPrice) : 0;
    const finalHardwarePrice = manualHardwarePrice !== null && manualHardwarePrice !== "" 
      ? parseFloat(manualHardwarePrice) 
      : calculatedHardwarePrice;
    const hardwareSell = finalHardwarePrice || 0;
    const profitOneShot = starterPack + hardwareSell + finalMonthlyFee;
    
    // Net after first month: Profit One Shot - Investment
    const netMonth1 = profitOneShot - finalInstallation;
    
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

  // Handle product selection change
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
            originalQuantity: 0, // New product, no original quantity
            originalType: "buy", // New product, default type
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
        // Clear monthly fee when switching to "buy"
        monthlyFee: type === "buy" ? 0 : detail.monthlyFee,
        monthlyFeeDisplay: type === "buy" ? "" : detail.monthlyFeeDisplay,
      },
    });
  };

  // Update product quantity - allow any input, validate on submit
  const handleQuantityChange = (productId: string, value: string) => {
    const detail = productDetails[productId];
    if (!detail) return;

    const quantity = value === "" ? 0 : parseInt(value, 10) || 0;

    setProductDetails({
      ...productDetails,
      [productId]: {
        ...detail,
        quantity: quantity,
      },
    });
    
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
    // For editing, we need to account for the original quantity that was already taken
    Object.values(productDetails).forEach((detail) => {
      // Calculate available stock: current stock + original quantity (since we're editing)
      const availableStock = detail.stockActuel + detail.originalQuantity;
      
      if (detail.quantity > availableStock) {
        newErrors[`quantity_${detail.productId}`] = `Not enough stock available for this product. Available: ${availableStock}, Requested: ${detail.quantity}`;
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

    // Validation: installation amount must be >= totalMonthlyFee
    if (finalInstallationAmount > 0 && finalTotalMonthlyFee > 0 && finalInstallationAmount < finalTotalMonthlyFee) {
      newErrors.total_sold_amount = "Le montant d'installation doit être supérieur ou égal aux frais mensuels totaux";
    }

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

    if (!client) return;

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      // Prepare products array for client
      // Preserve addedAt for existing products, set new timestamp for newly added products
      const now = new Date().toISOString();
      const existingProductIds = client.products?.map((p) => p.productId) || [];
      
      const clientProducts: ClientProduct[] = Object.values(productDetails).map((detail) => {
        const product = products.find((p) => p.id === detail.productId);
        const purchasePrice = product?.purchase_price || 0;
        const clientPrice = detail.type === "rent" 
          ? (product?.rent_price || 0)
          : (product?.purchase_price || 0); // Client pays purchase price when buying

        // If product already existed, preserve its addedAt, otherwise use current time
        const existingProduct = client.products?.find((p) => p.productId === detail.productId);
        const addedAt = existingProduct?.addedAt || now;

        return {
          productId: detail.productId,
          name: detail.name,
          quantity: detail.quantity,
          monthlyFee: detail.monthlyFee,
          type: detail.type || "buy",
          addedAt,
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

      // Update client
      await updateClient(client.id, {
        client_name: clientName.trim(),
        product_quantity: totalProductQuantity,
        total_sold_amount: finalInstallationAmount, // Store as total_sold_amount in DB (backward compatibility)
        monthly_fee: finalTotalMonthlyFee,
        months_left: finalMonthsLeft,
        products: clientProducts,
        starter_pack_price: starterPackPrice ? parseFloat(starterPackPrice) : undefined,
        hardware_price: finalHardwarePrice > 0 ? finalHardwarePrice : undefined,
        contract_start_date: contractStartDate || undefined,
        status: status,
      });

      // Update stock_actuel for each product
      // Calculate the difference: newQuantity - originalQuantity
      // If positive, decrease stock; if negative, increase stock
      // When a client buys products (type = "buy"), add quantity to hardware_total
      for (const detail of Object.values(productDetails)) {
        const product = products.find((p) => p.id === detail.productId);
        if (product) {
          const quantityDifference = detail.quantity - detail.originalQuantity;
          
          // Calculate new stock: current stock - quantity difference
          // (if quantity increased, difference is positive, so stock decreases)
          const newStockActuel = product.stock_actuel - quantityDifference;
          
          if (newStockActuel < 0) {
            throw new Error(`Not enough stock available for product ${product.name}. Available: ${product.stock_actuel + detail.originalQuantity}, Requested: ${detail.quantity}`);
          }
          
          const newTotalValue = newStockActuel * product.purchase_price;
          
          // Calculate hardware_total changes
          // When a client buys products (type = "buy"), add quantity to hardware_total
          // If changing from rent to buy: add the new quantity
          // If already buy and quantity increased: add the difference
          // If already buy and quantity decreased: don't subtract (hardware_total is cumulative)
          // If changing from buy to rent: don't subtract (it was already added)
          // For new products (originalQuantity = 0), if type is "buy", add the quantity
          let hardwareTotalChange = 0;
          if (detail.type === "buy") {
            if (detail.originalQuantity === 0) {
              // New product: add the full quantity
              hardwareTotalChange = detail.quantity;
            } else if (detail.originalType === "rent") {
              // Changing from rent to buy: add the new quantity
              hardwareTotalChange = detail.quantity;
            } else if (detail.originalType === "buy") {
              // Already buy: add the difference if quantity increased
              if (detail.quantity > detail.originalQuantity) {
                hardwareTotalChange = detail.quantity - detail.originalQuantity;
              }
              // If quantity decreased, don't subtract (hardware_total is cumulative)
            }
          }
          // If changing from buy to rent, don't change hardware_total (it was already added)
          
          const newHardwareTotal = (product.hardware_total ?? product.quantity ?? 0) + hardwareTotalChange;
          
          await updateProduct({
            ...product,
            stock_actuel: newStockActuel,
            quantity: newStockActuel, // Keep quantity in sync for backward compatibility
            total_value: newTotalValue,
            hardware_total: newHardwareTotal,
          });
        }
      }

      // Handle products that were removed (restore their stock)
      if (client.products && client.products.length > 0) {
        const currentProductIds = Object.keys(productDetails);
        const removedProducts = client.products.filter(
          (cp) => !currentProductIds.includes(cp.productId)
        );

        for (const removedProduct of removedProducts) {
          const product = products.find((p) => p.id === removedProduct.productId);
          if (product) {
            // Restore the original quantity to stock
            const newStockActuel = product.stock_actuel + removedProduct.quantity;
            const newTotalValue = newStockActuel * product.purchase_price;
            
            await updateProduct({
              ...product,
              stock_actuel: newStockActuel,
              quantity: newStockActuel,
              total_value: newTotalValue,
            });
          }
        }
      }

      onOpenChange(false);
      toast({
        title: "Client modifié avec succès",
        description: "Les informations du client ont été mises à jour.",
      });
    } catch (error: any) {
      console.error("Error updating client:", error);
      const errorMessage =
        error?.message ||
        "Erreur lors de la modification du client. Veuillez réessayer.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!client) return null;

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>
              Modifiez les informations du client {client.client_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_client_name">Nom du Client</Label>
              <Input
                id="edit_client_name"
                placeholder="Nom du client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
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
                              Stock disponible: {detail.stockActuel + detail.originalQuantity} • Prix d'achat: {detail.purchasePrice.toFixed(2)}€
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
                          <div className={detail.type === "rent" ? "grid grid-cols-2 gap-3" : "space-y-1"}>
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
                <Label htmlFor="edit_installation_amount">Montant d'installation (€)</Label>
                <Input
                  id="edit_installation_amount"
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
                />
                <p className="text-xs text-muted-foreground">
                  {manualTotalSoldAmount !== null ? "Valeur sauvegardée" : "Calculé automatiquement (somme des prix d'achat des produits achetés)"}
                </p>
                {errors.total_sold_amount && (
                  <p className="text-sm text-destructive">
                    {errors.total_sold_amount}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_monthly_fee">Frais Mensuels Totaux (€)</Label>
                <Input
                  id="edit_monthly_fee"
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
                />
                <p className="text-xs text-muted-foreground">
                  {manualTotalMonthlyFee !== null 
                    ? "Valeur manuelle (modifiable)" 
                    : `Calculé automatiquement: somme des frais mensuels de tous les produits`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_starter_pack_price">Starter Pack Price (€)</Label>
                <Input
                  id="edit_starter_pack_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={starterPackPrice}
                  onChange={(e) => setStarterPackPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_hardware_price">Hardware Price (€)</Label>
                <Input
                  id="edit_hardware_price"
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
                />
                <p className="text-xs text-muted-foreground">
                  {manualHardwarePrice !== null 
                    ? "Valeur manuelle (modifiable)" 
                    : "Calculé automatiquement: somme des prix d'achat des produits achetés"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_months_left">Mois Restants</Label>
              <Input
                id="edit_months_left"
                type="number"
                value={monthsLeft}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Calculé automatiquement: {monthsLeft}{" "}
                {monthsLeft === 1 ? "mois" : "mois"}
              </p>
              {errors.months_left && (
                <p className="text-sm text-destructive">{errors.months_left}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_contract_start_date">Date de Début du Contrat</Label>
              <Input
                id="edit_contract_start_date"
                type="date"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Statut</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as "active" | "inactive")}
              >
                <SelectTrigger id="edit_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setErrors({});
              }}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
