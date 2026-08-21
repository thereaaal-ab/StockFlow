import { useEffect, useState } from "react";
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
  CurrentOrder,
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  OrderPriority,
  OrderStatus,
} from "@/hooks/useOrders";
import { PipelineClient } from "@/hooks/usePipelineClients";
import { useProducts } from "@/hooks/useProducts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

type OrderFormValues = {
  item: string;
  productId?: string;
  quantity: number;
  totalPrice?: number;
  status: OrderStatus;
  priority: OrderPriority;
  requestedBy?: string;
  supplier?: string;
  linkedClientId?: string;
  dueDate?: string;
  notes?: string;
};

type OrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrderFormValues) => Promise<void>;
  order?: CurrentOrder;
  clients: PipelineClient[];
  isSubmitting?: boolean;
};

export function OrderModal({
  open,
  onOpenChange,
  onSubmit,
  order,
  clients,
  isSubmitting = false,
}: OrderModalProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const { products } = useProducts();

  const [form, setForm] = useState<OrderFormValues>({
    item: "",
    productId: "",
    quantity: 1,
    totalPrice: undefined,
    status: "a_commander",
    priority: "normale",
    requestedBy: "",
    supplier: "",
    linkedClientId: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;

    if (order) {
      setForm({
        item: order.item,
        productId: order.productId ?? "",
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        status: order.status,
        priority: order.priority,
        requestedBy: order.requestedBy,
        supplier: order.supplier,
        linkedClientId: order.linkedClientId,
        dueDate: order.dueDate ? order.dueDate.slice(0, 10) : "",
        notes: order.notes,
      });
      return;
    }

    setForm({
      item: "",
      productId: "",
      quantity: 1,
      totalPrice: undefined,
      status: "a_commander",
      priority: "normale",
      requestedBy: "",
      supplier: "",
      linkedClientId: "",
      dueDate: "",
      notes: "",
    });
  }, [open, order]);

  const isEdition = Boolean(order);
  const computedUnitPrice =
    form.totalPrice !== undefined && form.quantity > 0 ? form.totalPrice / form.quantity : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit(form);
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>
              {isEdition ? "Modifier la commande" : "Nouvelle commande"}
            </DialogTitle>
            <DialogDescription>
              Creez une commande interne ou liee a un client du pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order-product">Référence *</Label>
              <Select
                value={form.productId || ""}
                onValueChange={(value) => {
                  const product = products.find((p) => p.id === value);
                  // Le libellé suit la référence : les deux ne peuvent pas
                  // diverger si on change d'avis.
                  setForm((prev) => ({
                    ...prev,
                    productId: value,
                    item: product ? product.name : prev.item,
                  }));
                }}
              >
                <SelectTrigger id="order-product" data-testid="select-order-product">
                  <SelectValue placeholder="Choisir dans le catalogue" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} — {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-quantity">Quantite *</Label>
              <Input
                id="order-quantity"
                type="number"
                min="1"
                value={form.quantity}
                required
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: Number(e.target.value || 1) }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order-total-price">Prix total a payer (EUR)</Label>
              <Input
                id="order-total-price"
                type="number"
                min="0"
                step="0.01"
                value={form.totalPrice ?? ""}
                placeholder="Ex: 500"
                onChange={(e) => {
                  const rawValue = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    totalPrice: rawValue === "" ? undefined : Number(rawValue),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Coût unitaire déduit</Label>
              <div className="ro-data flex h-11 w-full items-center rounded-lg border border-input bg-muted px-4 text-sm font-bold">
                {computedUnitPrice !== null ? formatCurrency(computedUnitPrice) : "—"}
              </div>
            </div>
          </div>

          {/* Ce que le passage en « Reçu » va produire, dit avant. */}
          {form.productId && computedUnitPrice !== null && form.quantity > 0 && (
            <p className="text-xs text-muted-foreground">
              À la réception :{" "}
              <span className="ro-data font-bold text-foreground">
                {form.quantity} unité{form.quantity > 1 ? "s" : ""}
              </span>{" "}
              à{" "}
              <span className="ro-data font-bold text-foreground">
                {formatCurrency(computedUnitPrice)}
              </span>{" "}
              entreront en stock.
            </p>
          )}

          {!form.productId && (
            <div className="flex items-start gap-2.5 rounded-lg border border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] px-4 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--ro-feedback-warning-fg)]" />
              <p className="text-xs text-[color:var(--ro-feedback-warning-fg)]">
                Sans référence catalogue, cette commande n&apos;alimentera pas le
                stock au passage en « Reçu ».
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order-status">Statut</Label>
              <select
                id="order-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as OrderStatus,
                  }))
                }
              >
                {ORDER_STATUSES.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-priority">Priorite</Label>
              <select
                id="order-priority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: e.target.value as OrderPriority,
                  }))
                }
              >
                {ORDER_PRIORITIES.map((priority) => (
                  <option value={priority} key={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order-client">Client lie</Label>
              <select
                id="order-client"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.linkedClientId ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    linkedClientId: e.target.value || undefined,
                  }))
                }
              >
                <option value="">Aucun (besoin interne)</option>
                {clients.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-due-date">Echeance</Label>
              <Input
                id="order-due-date"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order-requester">Demande par</Label>
              <Input
                id="order-requester"
                value={form.requestedBy ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, requestedBy: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-supplier">Fournisseur</Label>
              <Input
                id="order-supplier"
                value={form.supplier ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, supplier: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-notes">Notes</Label>
            <Textarea
              id="order-notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || undefined }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : isEdition ? "Mettre a jour" : "Creer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
