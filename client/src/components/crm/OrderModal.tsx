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

type OrderFormValues = {
  item: string;
  quantity: number;
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
  const [form, setForm] = useState<OrderFormValues>({
    item: "",
    quantity: 1,
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
        quantity: order.quantity,
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
      quantity: 1,
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
              <Label htmlFor="order-item">Produit *</Label>
              <Input
                id="order-item"
                value={form.item}
                required
                onChange={(e) => setForm((prev) => ({ ...prev, item: e.target.value }))}
              />
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
