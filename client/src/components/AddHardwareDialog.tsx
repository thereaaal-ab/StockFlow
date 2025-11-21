import { useState } from "react";
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
import { Plus } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddHardwareDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    quantity: "",
    buyPrice: "",
    sellPrice: "",
    rentPrice: "",
    category_id: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { createProduct } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const quantity = parseInt(formData.quantity) || 0;
      await createProduct({
        code: formData.code,
        name: formData.name,
        quantity: quantity, // Keep for backward compatibility
        hardware_total: quantity, // Original quantity - set to initial quantity
        stock_actuel: quantity, // Current stock - set to initial quantity
        purchase_price: parseFloat(formData.buyPrice) || 0,
        selling_price: parseFloat(formData.sellPrice) || 0,
        rent_price: parseFloat(formData.rentPrice) || 0,
        profit: 0, // Will be calculated in the hook
        total_value: 0, // Will be calculated in the hook
        category: "Other", // Keep for backward compatibility
        category_id: formData.category_id || undefined,
      });
      setOpen(false);
      setFormData({
        code: "",
        name: "",
        quantity: "",
        buyPrice: "",
        sellPrice: "",
        rentPrice: "",
        category_id: "",
      });
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Erreur lors de l'ajout du produit");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-hardware">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter Matériel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau matériel</DialogTitle>
            <DialogDescription>
              Remplissez les informations du nouveau matériel à ajouter à l'inventaire.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code Produit</Label>
                <Input
                  id="code"
                  placeholder="AKSP-21"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  data-testid="input-code"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  data-testid="input-quantity"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom Produit</Label>
              <Input
                id="name"
                placeholder="Kiosk 21.5"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyPrice">Prix d'achat (€)</Label>
                <Input
                  id="buyPrice"
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                  data-testid="input-buy-price"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellPrice">Prix de vente (€)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  placeholder="1699.99"
                  value={formData.sellPrice}
                  onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                  data-testid="input-sell-price"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentPrice">Prix Location (€)</Label>
              <Input
                id="rentPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.rentPrice}
                onChange={(e) => setFormData({ ...formData, rentPrice: e.target.value })}
                data-testid="input-rent-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
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
                  <SelectTrigger id="category" data-testid="select-category">
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
