import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useReceiveLot } from "@/hooks/useHardware";
import { formatCurrencyFull } from "@/lib/utils";

interface ReceiveLotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-sélectionne une référence quand on ouvre depuis sa fiche. */
  productId?: string;
}

/**
 * Réception d'un lot de matériel.
 *
 * Le coût saisi ici est le coût de revient réel, transport compris : c'est
 * lui qui restera attaché aux machines de ce lot, quoi qu'il arrive au prix
 * des lots suivants.
 */
export function ReceiveLotDialog({
  open,
  onOpenChange,
  productId,
}: ReceiveLotDialogProps) {
  const { toast } = useToast();
  const { products } = useProducts();
  const { receiveLot, isReceiving } = useReceiveLot();

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    productId: productId ?? "",
    quantity: "",
    unitCost: "",
    supplier: "",
    receivedAt: today,
    reference: "",
    notes: "",
  });

  const selected = products.find((p) => p.id === (productId ?? form.productId));
  const quantity = parseInt(form.quantity) || 0;
  const unitCost = parseFloat(form.unitCost.replace(",", ".")) || 0;
  const total = quantity * unitCost;

  // Aperçu des étiquettes qui vont être générées : on montre ce qui sera
  // collé sur les machines avant de valider, pas après.
  const tagPreview = useMemo(() => {
    if (!selected?.tracked_by_unit || quantity <= 0) return null;
    const prefix =
      selected.asset_prefix ||
      selected.code.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
    const start = (selected.unit_counter ?? 0) + 1;
    const pad = (n: number) => `${prefix}-${String(n).padStart(4, "0")}`;
    if (quantity === 1) return pad(start);
    return `${pad(start)} → ${pad(start + quantity - 1)}`;
  }, [selected, quantity]);

  const reset = () =>
    setForm({
      productId: productId ?? "",
      quantity: "",
      unitCost: "",
      supplier: "",
      receivedAt: today,
      reference: "",
      notes: "",
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = productId ?? form.productId;
    if (!target || quantity <= 0) return;

    try {
      await receiveLot({
        productId: target,
        quantity,
        unitCost,
        supplier: form.supplier,
        receivedAt: form.receivedAt,
        reference: form.reference,
        notes: form.notes,
      });
      toast({
        title: "Lot réceptionné",
        description: selected?.tracked_by_unit
          ? `${quantity} unité${quantity > 1 ? "s" : ""} numérotée${quantity > 1 ? "s" : ""} · ${tagPreview}`
          : `${quantity} pièce${quantity > 1 ? "s" : ""} ajoutée${quantity > 1 ? "s" : ""} au stock`,
      });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Réception impossible",
        description: error?.message || "Le lot n'a pas pu être enregistré.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Réceptionner un lot</DialogTitle>
            <DialogDescription>
              Le coût saisi est le coût de revient réel, transport et douane
              compris. Il reste attaché à ces machines pour toujours.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            {!productId && (
              <div className="grid gap-2">
                <Label htmlFor="lot-product">Référence</Label>
                <Select
                  value={form.productId}
                  onValueChange={(v) => setForm({ ...form, productId: v })}
                >
                  <SelectTrigger id="lot-product" data-testid="select-lot-product">
                    <SelectValue placeholder="Choisir une référence" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lot-quantity">Quantité reçue</Label>
                <Input
                  id="lot-quantity"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="10"
                  required
                  data-testid="input-lot-quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lot-cost">Coût de revient unitaire</Label>
                <Input
                  id="lot-cost"
                  inputMode="decimal"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                  placeholder="1200"
                  required
                  data-testid="input-lot-cost"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lot-supplier">Fournisseur</Label>
                <Input
                  id="lot-supplier"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lot-date">Date de réception</Label>
                <Input
                  id="lot-date"
                  type="date"
                  value={form.receivedAt}
                  onChange={(e) => setForm({ ...form, receivedAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lot-reference">Référence facture ou bon de livraison</Label>
              <Input
                id="lot-reference"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Optionnel"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lot-notes">Note</Label>
              <Textarea
                id="lot-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex. +200 €/unité de fret aérien"
              />
            </div>

            {/* Ce que la réception va produire, avant de valider. */}
            {quantity > 0 && (
              <div className="rounded-md bg-muted px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="ro-overline text-[10px]">Total du lot</span>
                  <span className="ro-figure text-xl">
                    {formatCurrencyFull(total)}
                  </span>
                </div>
                {tagPreview ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Étiquettes générées :{" "}
                    <span className="ro-data font-bold text-foreground">
                      {tagPreview}
                    </span>
                  </p>
                ) : selected && !selected.tracked_by_unit ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cette référence n&apos;est pas suivie à l&apos;unité : le
                    stock est mis à jour, aucune étiquette n&apos;est générée.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isReceiving || quantity <= 0 || !(productId ?? form.productId)}
              data-testid="button-submit-lot"
            >
              {isReceiving ? "Réception…" : "Réceptionner le lot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
