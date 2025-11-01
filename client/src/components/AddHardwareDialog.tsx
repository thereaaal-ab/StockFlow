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

export function AddHardwareDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    quantity: "",
    buyPrice: "",
    sellPrice: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Add hardware:", formData);
    setOpen(false);
    setFormData({
      code: "",
      name: "",
      quantity: "",
      buyPrice: "",
      sellPrice: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-hardware">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter Matériel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel"
            >
              Annuler
            </Button>
            <Button type="submit" data-testid="button-submit">
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
