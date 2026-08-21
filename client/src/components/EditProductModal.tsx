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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  countClientsHoldingProduct,
  syncProductCostToClients,
} from "@/hooks/useClients";
import type { Product } from "@/hooks/useProducts";

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
    tracked_by_unit: false,
    asset_prefix: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Les fiches clients portent une copie du prix d'achat, figée au jour de
   * l'installation. Quand ce prix change, on demande s'il s'agit d'une
   * correction (à propager) ou d'un nouveau tarif (à laisser).
   */
  const [affectedClients, setAffectedClients] = useState(0);
  const [frozenCost, setFrozenCost] = useState<number | null>(null);
  const [propagate, setPropagate] = useState(false);
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Calculate profit and total_value
  const purchasePrice = parseFloat(formData.purchase_price) || 0;
  const sellingPrice = parseFloat(formData.selling_price) || 0;
  const quantity = parseFloat(formData.quantity) || 0;
  const profit = sellingPrice - purchasePrice;
  const totalValue = quantity * purchasePrice;
  const defaultPrefix =
    (formData.code || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() ||
    "BRN";

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
        tracked_by_unit: !!product.tracked_by_unit,
        asset_prefix: product.asset_prefix || "",
      });
      setPropagate(false);
      countClientsHoldingProduct(product.id)
        .then(({ clients, frozenCosts }) => {
          setAffectedClients(clients);
          setFrozenCost(frozenCosts.length ? frozenCosts[0] : null);
        })
        .catch(() => {
          setAffectedClients(0);
          setFrozenCost(null);
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
        tracked_by_unit: formData.tracked_by_unit,
        asset_prefix: formData.asset_prefix.trim().toUpperCase() || undefined,
        profit: profit,
        total_value: totalValue,
      });

      // Correction d'un prix faux : on répercute sur les fiches qui l'avaient
      // figé. Seulement si l'utilisateur l'a demandé — un tarif qui change
      // ne doit pas réécrire le coût des contrats déjà signés.
      if (propagate && product) {
        await syncProductCostToClients(product.id, purchasePrice);
      }

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
            {/* Le prix d'achat a bougé et des clients portent l'ancien :
                on demande explicitement s'il faut les corriger. */}
            {affectedClients > 0 &&
              frozenCost !== null &&
              Math.abs(frozenCost - purchasePrice) > 0.01 && (
                <div className="rounded-md border border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="propagate-cost"
                      checked={propagate}
                      onCheckedChange={(c: boolean | "indeterminate") => setPropagate(c === true)}
                      className="mt-0.5"
                      data-testid="checkbox-propagate-cost"
                    />
                    <div className="min-w-0">
                      <Label
                        htmlFor="propagate-cost"
                        className="cursor-pointer text-sm font-bold text-[color:var(--ro-feedback-warning-fg)]"
                      >
                        Corriger aussi les {affectedClients} fiche
                        {affectedClients > 1 ? "s" : ""} client
                        {affectedClients > 1 ? "s" : ""}
                      </Label>
                      <p className="mt-1 text-xs text-[color:var(--ro-feedback-warning-fg)]">
                        Elles portent {frozenCost.toFixed(2)} € figés au jour de
                        l&apos;installation. Cochez si l&apos;ancien prix était
                        faux ; laissez décoché s&apos;il s&apos;agit d&apos;un
                        nouveau tarif fournisseur — les contrats passés doivent
                        alors garder leur coût d&apos;époque.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Suivi à l'unité : c'est ici qu'on l'active pour les bornes et
                les POS déjà présents au catalogue. */}
            <div className="rounded-md border border-border bg-muted px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor="edit-tracked" className="text-sm font-bold">
                    Suivi à l&apos;unité
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chaque exemplaire reçu recevra un numéro d&apos;inventaire et
                    gardera le coût de son lot.
                  </p>
                </div>
                <Switch
                  id="edit-tracked"
                  checked={formData.tracked_by_unit}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, tracked_by_unit: v })
                  }
                  data-testid="switch-edit-tracked"
                />
              </div>
              {formData.tracked_by_unit && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="edit-asset-prefix">Préfixe des étiquettes</Label>
                  <Input
                    id="edit-asset-prefix"
                    maxLength={8}
                    placeholder={defaultPrefix}
                    value={formData.asset_prefix}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_prefix: e.target.value })
                    }
                    data-testid="input-edit-asset-prefix"
                  />
                  <p className="ro-data text-xs text-muted-foreground">
                    {(formData.asset_prefix.trim().toUpperCase() || defaultPrefix)}-0001,
                    -0002, -0003…
                  </p>
                </div>
              )}
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

