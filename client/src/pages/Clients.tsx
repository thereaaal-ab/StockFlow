import { Users } from "lucide-react";
import { ClientCard } from "@/components/ClientCard";
import { AddClientModal } from "@/components/AddClientModal";
import { BulkImportClientsDialog } from "@/components/BulkImportClientsDialog";
import { ClientDetailsModal } from "@/components/ClientDetailsModal";
import { EditClientModal } from "@/components/EditClientModal";
import { useState } from "react";
import { useClients, Client } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { clients, isLoading, deleteClient, isDeleting } = useClients();
  const { toast } = useToast();

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleDelete = async (client: Client) => {
    try {
      await deleteClient(client.id);
      toast({
        title: "Client supprimé",
        description: `Le client "${client.client_name}" a été supprimé avec succès.`,
      });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de la suppression du client.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-heading" data-testid="text-page-title">
            Clients
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des clients et de leur matériel assigné
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkImportClientsDialog />
          <AddClientModal />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement des clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
            <Users className="size-7" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">Aucun client enregistré</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Ajoutez un client ou importez une liste pour suivre contrats, matériel et rentabilité.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onViewDetails={() => handleViewDetails(client)}
                onEdit={() => handleEdit(client)}
                onDelete={() => handleDelete(client)}
                isDeleting={isDeleting}
              />
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            Total: {clients.length} clients actifs
          </div>
        </>
      )}

      <ClientDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        client={selectedClient}
      />

      <EditClientModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        client={selectedClient}
      />
    </div>
  );
}
