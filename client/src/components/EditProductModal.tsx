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

interface Product {
  id: string;
  code: string;
  name: string;
  quantity: number;
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
    category: "",
  });
  const [isSaving, setIsSaving] = useState(false);

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
        category: product.category || "",
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsSaving(true);
    try {
      await onSave({
        ...product,
        code: formData.code,
        name: formData.name,
        quantity: parseInt(formData.quantity) || 0,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        category: formData.category,
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
              <Label htmlFor="edit-category">Catégorie</Label>
              <Input
                id="edit-category"
                placeholder="Ex: Phones, Laptops, Chargers, Headphones, Wifi Routers..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                data-testid="input-edit-category"
                required
              />
              <p className="text-xs text-muted-foreground">
                Saisissez librement la catégorie du produit
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

