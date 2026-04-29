import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { OrderModal } from "@/components/crm/OrderModal";
import {
  CurrentOrder,
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  OrderPriority,
  OrderStatus,
  useOrders,
} from "@/hooks/useOrders";
import { usePipelineClients } from "@/hooks/usePipelineClients";

const KANBAN_ORDER_STATUSES: OrderStatus[] = ["a_commander", "commande", "recu"];
const STATUS_LABELS: Record<OrderStatus, string> = {
  a_commander: "A commander",
  commande: "Commande",
  recu: "Recu",
  annule: "Annule",
};

const PRIORITY_CLASSNAME: Record<OrderPriority, string> = {
  basse: "bg-muted text-muted-foreground",
  normale: "bg-primary/10 text-primary",
  urgente: "bg-destructive/10 text-destructive",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const { clients } = usePipelineClients();
  const { orders, isLoading, createOrder, updateOrder, isCreating, isUpdating } = useOrders();

  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CurrentOrder | undefined>(undefined);

  const groupedOrders = useMemo(() => {
    return KANBAN_ORDER_STATUSES.reduce<Record<OrderStatus, CurrentOrder[]>>(
      (acc, status) => {
        acc[status] = orders.filter((order) => order.status === status);
        return acc;
      },
      {
        a_commander: [],
        commande: [],
        recu: [],
        annule: [],
      }
    );
  }, [orders]);

  const getLinkedClientName = (linkedClientId?: string) => {
    if (!linkedClientId) return "Besoin interne";
    const linkedClient = clients.find((client) => client.id === linkedClientId);
    return linkedClient?.name ?? "Client inconnu";
  };

  const handleDrop = async (status: OrderStatus) => {
    if (!draggedOrderId) return;
    const target = orders.find((order) => order.id === draggedOrderId);
    if (!target || target.status === status) return;

    try {
      await updateOrder(target.id, { status });
      toast({
        title: "Commande mise a jour",
        description: `"${target.item}" passe en "${STATUS_LABELS[status]}".`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message ?? "Impossible de mettre a jour cette commande.",
        variant: "destructive",
      });
    } finally {
      setDraggedOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-heading">Commandes Actuelles</h1>
          <p className="mt-1 text-muted-foreground">
            Suivez les achats en cours et liez-les facilement aux clients.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une commande
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Chargement des commandes...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {KANBAN_ORDER_STATUSES.map((status) => (
              <Card
                key={status}
                className="min-h-[420px] border-dashed"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDrop(status)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{STATUS_LABELS[status]}</span>
                    <Badge variant="secondary">{groupedOrders[status].length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedOrders[status].map((order) => (
                    <div
                      key={order.id}
                      className="cursor-grab rounded-lg border bg-card p-3 active:cursor-grabbing"
                      draggable
                      onDragStart={() => setDraggedOrderId(order.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{order.item}</p>
                          <p className="text-xs text-muted-foreground">Quantite: {order.quantity}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingOrder(order)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className={PRIORITY_CLASSNAME[order.priority]}>{order.priority}</Badge>
                        <Badge variant="outline">{getLinkedClientName(order.linkedClientId)}</Badge>
                      </div>
                      {order.notes ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{order.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {orders.some((order) => order.status === "annule") ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Commandes annulees</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {orders
                  .filter((order) => order.status === "annule")
                  .map((order) => (
                    <div key={order.id} className="rounded-md border p-2 text-sm">
                      {order.item} ({order.quantity})
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <OrderModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        isSubmitting={isCreating}
        clients={clients}
        onSubmit={async (values) => {
          await createOrder(values);
          setIsCreateOpen(false);
          toast({ title: "Commande creee", description: "La commande est enregistree." });
        }}
      />

      <OrderModal
        open={Boolean(editingOrder)}
        onOpenChange={(open) => {
          if (!open) setEditingOrder(undefined);
        }}
        order={editingOrder}
        clients={clients}
        isSubmitting={isUpdating}
        onSubmit={async (values) => {
          if (!editingOrder) return;
          await updateOrder(editingOrder.id, values);
          setEditingOrder(undefined);
          toast({ title: "Commande mise a jour", description: "Les modifications ont ete appliquees." });
        }}
      />
    </div>
  );
}
