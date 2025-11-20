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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";

export function AddClientModal() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    product_quantity: "",
    total_sold_amount: "",
    monthly_fee: "",
    product_id: "",
  });
  const { products } = useProducts();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { createClient } = useClients();
  const { toast } = useToast();

  // Calculate months_left automatically
  const monthsLeft = (() => {
    const totalSold = parseFloat(formData.total_sold_amount) || 0;
    const monthlyFee = parseFloat(formData.monthly_fee) || 0;
    if (monthlyFee > 0) {
      return Math.ceil(totalSold / monthlyFee);
    }
    return 0;
  })();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) {
      newErrors.client_name = "Le nom du client est requis";
    }

    const productQty = parseInt(formData.product_quantity, 10);
    if (!formData.product_quantity || isNaN(productQty) || productQty < 1) {
      newErrors.product_quantity = "La quantité de produits doit être supérieure ou égale à 1";
    }

    const totalSold = parseFloat(formData.total_sold_amount);
    if (!formData.total_sold_amount || isNaN(totalSold) || totalSold < 0) {
      newErrors.total_sold_amount = "Le montant total vendu doit être un nombre positif";
    }

    const monthlyFee = parseFloat(formData.monthly_fee);
    if (!formData.monthly_fee || isNaN(monthlyFee) || monthlyFee <= 0) {
      newErrors.monthly_fee = "Les frais mensuels doivent être supérieurs à 0";
    }

    // Validation: total_sold_amount must be >= monthly_fee
    if (totalSold > 0 && monthlyFee > 0 && totalSold < monthlyFee) {
      newErrors.total_sold_amount = "Le montant total vendu doit être supérieur ou égal aux frais mensuels";
    }

    // Validation: months_left must be >= 1
    if (monthsLeft < 1) {
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
      await createClient({
        client_name: formData.client_name.trim(),
        product_quantity: parseInt(formData.product_quantity, 10),
        total_sold_amount: parseFloat(formData.total_sold_amount),
        monthly_fee: parseFloat(formData.monthly_fee),
        months_left: monthsLeft,
        product_id: formData.product_id || undefined,
      });
      
      setOpen(false);
      setFormData({
        client_name: "",
        product_quantity: "",
        total_sold_amount: "",
        monthly_fee: "",
        product_id: "",
      });
      setErrors({});
      
      toast({
        title: "Client added successfully!",
        description: "Le client a été ajouté à la base de données.",
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

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau client</DialogTitle>
            <DialogDescription>
              Remplissez les informations du nouveau client à ajouter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nom du Client</Label>
              <Input
                id="client_name"
                placeholder="Nom du client"
                value={formData.client_name}
                onChange={(e) => handleInputChange("client_name", e.target.value)}
                data-testid="input-client-name"
                required
              />
              {errors.client_name && (
                <p className="text-sm text-destructive">{errors.client_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_quantity">Quantité de Produits</Label>
              <Input
                id="product_quantity"
                type="number"
                placeholder="0"
                value={formData.product_quantity}
                onChange={(e) => handleInputChange("product_quantity", e.target.value)}
                data-testid="input-product-quantity"
                required
              />
              {errors.product_quantity && (
                <p className="text-sm text-destructive">{errors.product_quantity}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_sold_amount">Montant Total Vendu (€)</Label>
                <Input
                  id="total_sold_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.total_sold_amount}
                  onChange={(e) => handleInputChange("total_sold_amount", e.target.value)}
                  data-testid="input-total-sold"
                  required
                />
                {errors.total_sold_amount && (
                  <p className="text-sm text-destructive">{errors.total_sold_amount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Frais Mensuels (€)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.monthly_fee}
                  onChange={(e) => handleInputChange("monthly_fee", e.target.value)}
                  data-testid="input-monthly-fee"
                  required
                />
                {errors.monthly_fee && (
                  <p className="text-sm text-destructive">{errors.monthly_fee}</p>
                )}
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="product_id">Produit (optionnel)</Label>
              <Select
                value={formData.product_id || undefined}
                onValueChange={(value) => handleInputChange("product_id", value)}
              >
                <SelectTrigger id="product_id" data-testid="input-product-id">
                  <SelectValue placeholder="Sélectionner un produit (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectItem value="no-products" disabled>
                      Aucun produit disponible
                    </SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formData.product_id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleInputChange("product_id", "")}
                >
                  Effacer la sélection
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Lier ce client à un produit pour les analyses par catégorie
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setErrors({});
              }}
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

