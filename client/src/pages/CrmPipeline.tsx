import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CLIENT_STATUSES,
  ClientStatus,
  PipelineClient,
  usePipelineClients,
} from "@/hooks/usePipelineClients";
import { ClientModal } from "@/components/crm/ClientModal";

const STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: "Prospect",
  offre: "Offre envoyee",
  negociation: "Negociation",
  valide: "Valide",
  refuse: "Refuse",
};

export default function CrmPipeline() {
  const { toast } = useToast();
  const {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePipelineClients();
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<PipelineClient | undefined>(undefined);

  const groupedClients = useMemo(() => {
    return CLIENT_STATUSES.reduce<Record<ClientStatus, PipelineClient[]>>((acc, status) => {
      acc[status] = clients.filter((client) => client.status === status);
      return acc;
    }, {} as Record<ClientStatus, PipelineClient[]>);
  }, [clients]);

  const handleDrop = async (status: ClientStatus) => {
    if (!draggedClientId) return;
    const target = clients.find((client) => client.id === draggedClientId);
    if (!target || target.status === status) return;

    try {
      await updateClient(target.id, { status });
      toast({
        title: "Statut mis a jour",
        description: `${target.name} est maintenant en "${STATUS_LABELS[status]}".`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message ?? "Impossible de deplacer ce client.",
        variant: "destructive",
      });
    } finally {
      setDraggedClientId(null);
    }
  };

  const handleDeleteClient = async (client: PipelineClient) => {
    const shouldDelete = window.confirm(
      `Delete client "${client.name}"? This action cannot be undone.`
    );
    if (!shouldDelete) return;

    try {
      await deleteClient(client.id);
      toast({
        title: "Client deleted",
        description: `${client.name} was removed from the pipeline.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Unable to delete this client.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-heading">Pipeline Clients</h1>
          <p className="mt-1 text-muted-foreground">
            Suivi commercial visuel du prospect jusqu'a la validation.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Chargement du pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {CLIENT_STATUSES.map((status) => (
            <Card
              key={status}
              className="min-h-[420px] border-dashed"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleDrop(status)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{STATUS_LABELS[status]}</span>
                  <Badge variant="secondary">{groupedClients[status].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedClients[status].map((client) => (
                  <div
                    key={client.id}
                    className="cursor-grab rounded-lg border bg-card p-3 active:cursor-grabbing"
                    draggable
                    onDragStart={() => setDraggedClientId(client.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.company ? (
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingClient(client)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => void handleDeleteClient(client)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{client.needs}</p>
                    {client.estimatedValue ? (
                      <p className="mt-2 text-xs font-medium">
                        Valeur estimee:{" "}
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(client.estimatedValue)}
                      </p>
                    ) : null}
                  </div>
                ))}
                {groupedClients[status].length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Deposez un client ici
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          await createClient(values);
          setIsCreateOpen(false);
          toast({ title: "Client cree", description: "Le client a ete ajoute au pipeline." });
        }}
      />

      <ClientModal
        open={Boolean(editingClient)}
        client={editingClient}
        onOpenChange={(open) => {
          if (!open) setEditingClient(undefined);
        }}
        isSubmitting={isUpdating}
        onSubmit={async (values) => {
          if (!editingClient) return;
          await updateClient(editingClient.id, values);
          setEditingClient(undefined);
          toast({ title: "Client mis a jour", description: "Les informations ont ete enregistrees." });
        }}
      />
    </div>
  );
}
