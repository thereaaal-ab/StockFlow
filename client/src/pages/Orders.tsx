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

/* La priorité est un état de feedback, pas une action : neutre / info / rouge. */
const PRIORITY_CLASSNAME: Record<OrderPriority, string> = {
  basse: "ro-badge-info",
  normale: "ro-badge-warning",
  urgente: "ro-badge-error",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const { clients } = usePipelineClients();
  const {
    orders,
    isLoading,
    createOrder,
    updateOrder,
    receiveOrder,
    unreceiveOrder,
    isCreating,
    isUpdating,
  } = useOrders();

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  /**
   * Le passage en « Reçu » est le point d'entrée du matériel.
   *
   * Il ne se contente pas de changer une colonne : il crée le lot au coût
   * déduit (total ÷ quantité), numérote les machines et fait monter le stock.
   * Sortir de « Reçu » annule la réception — refusée par la base si une
   * machine du lot est déjà partie chez un client.
   */
  const handleDrop = async (status: OrderStatus) => {
    if (!draggedOrderId) return;
    const target = orders.find((order) => order.id === draggedOrderId);
    if (!target || target.status === status) return;

    try {
      if (status === "recu") {
        if (!target.productId) {
          toast({
            title: "Référence manquante",
            description:
              "Reliez cette commande à une référence du catalogue pour qu'elle puisse alimenter le stock.",
            variant: "destructive",
          });
          return;
        }
        if (!target.totalPrice || target.totalPrice <= 0) {
          toast({
            title: "Prix total manquant",
            description:
              "Sans prix total, le coût unitaire ne peut pas être calculé.",
            variant: "destructive",
          });
          return;
        }

        await receiveOrder(target.id);
        const unitCost = target.totalPrice / target.quantity;
        toast({
          title: "Commande réceptionnée",
          description: `${target.quantity} × "${target.item}" en stock à ${formatCurrency(unitCost)} l'unité.`,
        });
        return;
      }

      // On quitte « Reçu » : la réception doit être défaite, sinon le stock
      // resterait gonflé d'un matériel qu'on dit ne pas avoir reçu.
      if (target.status === "recu" && target.receivedLotId) {
        await unreceiveOrder(target.id);
      }

      await updateOrder(target.id, { status });
      toast({
        title: "Commande mise à jour",
        description: `« ${target.item} » passe en « ${STATUS_LABELS[status]} ».`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message ?? "Impossible de mettre à jour cette commande.",
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
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="ro-overline text-[11px]">{STATUS_LABELS[status]}</span>
                    <span className="ro-data text-sm font-bold text-foreground">
                      {groupedOrders[status].length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedOrders[status].map((order) => (
                    <div
                      key={order.id}
                      className="ro-press cursor-grab rounded-md border border-card-border bg-muted p-3 shadow-sm active:cursor-grabbing"
                      draggable
                      onDragStart={() => setDraggedOrderId(order.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold leading-tight">{order.item}</p>
                          {/* Le chiffre porte la phrase : quantité et montants en mono. */}
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            <span className="ro-data font-bold text-foreground">
                              ×{order.quantity}
                            </span>
                          </p>
                          {order.totalPrice !== undefined ? (
                            <p className="ro-figure mt-1 text-base">
                              {formatCurrency(order.totalPrice)}
                            </p>
                          ) : null}
                          {order.totalPrice !== undefined && order.quantity > 0 ? (
                            <p className="ro-data mt-0.5 text-[11px] text-muted-foreground">
                              {formatCurrency(order.totalPrice / order.quantity)} / unité
                            </p>
                          ) : null}
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {/* Une commande reçue a réellement alimenté le stock :
                            on le montre, sinon on ne peut pas distinguer une
                            carte glissée d'une réception effective. */}
                        {order.receivedLotId && (
                          <Badge variant="outline" className="ro-badge-success">
                            en stock
                          </Badge>
                        )}
                        <Badge variant="outline" className={PRIORITY_CLASSNAME[order.priority]}>
                          {order.priority}
                        </Badge>
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
                <CardTitle className="text-sm">Commandes annulées</CardTitle>
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
