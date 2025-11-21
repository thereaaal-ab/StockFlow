import { useState, useEffect } from "react";
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
import { useCategories } from "@/hooks/useCategories";

interface Product {
  id: string;
  code: string;
  name: string;
  quantity: number;
  hardware_total?: number;
  stock_actuel?: number;
  purchase_price: number | string;
  selling_price: number | string;
  category?: string;
  profit?: number | string;
  total_value?: number | string;
}

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSave: (product: Product) => Promise<void>;
}

export function EditProductModal({
  open,
  onOpenChange,
  product,
  onSave,
}: EditProductModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    quantity: "",
    purchase_price: "",
    selling_price: "",
    rent_price: "",
    category_id: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Calculate profit and total_value
  const purchasePrice = parseFloat(formData.purchase_price) || 0;
  const sellingPrice = parseFloat(formData.selling_price) || 0;
  const quantity = parseFloat(formData.quantity) || 0;
  const profit = sellingPrice - purchasePrice;
  const totalValue = quantity * purchasePrice;

  // Preload product data when modal opens
  useEffect(() => {
    if (product && open) {
      setFormData({
        code: product.code || "",
        name: product.name || "",
        quantity: product.quantity?.toString() || "0",
        purchase_price:
          typeof product.purchase_price === "string"
            ? product.purchase_price
            : product.purchase_price?.toString() || "0",
        selling_price:
          typeof product.selling_price === "string"
            ? product.selling_price
            : product.selling_price?.toString() || "0",
        rent_price:
          typeof product.rent_price === "string"
            ? product.rent_price
            : product.rent_price?.toString() || "0",
        category_id: product.category_id || "",
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsSaving(true);
    try {
      // When editing, update both hardware_total and stock_actuel to match the new quantity
      // This allows manual correction of both values if needed
      const newQuantity = parseInt(formData.quantity) || 0;
      
      await onSave({
        ...product,
        code: formData.code,
        name: formData.name,
        quantity: newQuantity,
        hardware_total: newQuantity, // Update hardware_total to match quantity when manually editing
        stock_actuel: newQuantity, // Update stock_actuel to match quantity when manually editing
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        rent_price: parseFloat(formData.rent_price) || 0,
        category: product.category || "Other", // Keep for backward compatibility
        category_id: formData.category_id || undefined,
        profit: profit,
        total_value: totalValue,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Erreur lors de la sauvegarde du produit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              Modifiez les informations du produit. Les calculs se mettent à jour automatiquement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code Produit</Label>
                <Input
                  id="edit-code"
                  placeholder="AKSP-21"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  data-testid="input-edit-code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantité</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  data-testid="input-edit-quantity"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  La quantité sera utilisée pour hardware_total et stock_actuel
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom Produit</Label>
              <Input
                id="edit-name"
                placeholder="Kiosk 21.5"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-purchase-price">Prix d'achat (€)</Label>
                <Input
                  id="edit-purchase-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="500.00"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    setFormData({ ...formData, purchase_price: e.target.value })
                  }
                  data-testid="input-edit-purchase-price"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-selling-price">Prix de vente (€)</Label>
                <Input
                  id="edit-selling-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1699.99"
                  value={formData.selling_price}
                  onChange={(e) =>
                    setFormData({ ...formData, selling_price: e.target.value })
                  }
                  data-testid="input-edit-selling-price"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rent-price">Prix Location (€)</Label>
              <Input
                id="edit-rent-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.rent_price}
                onChange={(e) =>
                  setFormData({ ...formData, rent_price: e.target.value })
                }
                data-testid="input-edit-rent-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Catégorie</Label>
              {categoriesLoading ? (
                <div className="text-sm text-muted-foreground">Chargement des catégories...</div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Aucune catégorie disponible. Créez-en une dans les paramètres.
                </div>
              ) : (
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger id="edit-category" data-testid="select-edit-category">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Sélectionnez une catégorie existante ou créez-en une dans les paramètres
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Profit (calculé)</Label>
                <div className="text-lg font-semibold text-green-600">
                  {profit.toFixed(2)} €
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Valeur totale (calculée)</Label>
                <div className="text-lg font-semibold">
                  {totalValue.toFixed(2)} €
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              data-testid="button-edit-cancel"
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button type="submit" data-testid="button-edit-save" disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

