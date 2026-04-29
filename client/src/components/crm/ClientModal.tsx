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
  CLIENT_STATUSES,
  ClientStatus,
  PipelineClient,
} from "@/hooks/usePipelineClients";

type ClientFormValues = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  needs: string;
  estimatedValue?: number;
};

type ClientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  client?: PipelineClient;
  isSubmitting?: boolean;
};

export function ClientModal({
  open,
  onOpenChange,
  onSubmit,
  client,
  isSubmitting = false,
}: ClientModalProps) {
  const [form, setForm] = useState<ClientFormValues>({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "prospect",
    needs: "",
    estimatedValue: undefined,
  });

  useEffect(() => {
    if (!open) return;

    if (client) {
      setForm({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        status: client.status,
        needs: client.needs,
        estimatedValue: client.estimatedValue,
      });
      return;
    }

    setForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "prospect",
      needs: "",
      estimatedValue: undefined,
    });
  }, [client, open]);

  const isEdition = Boolean(client);

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
              {isEdition ? "Modifier le client" : "Nouveau client CRM"}
            </DialogTitle>
            <DialogDescription>
              Renseignez le besoin et positionnez le client dans le pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="crm-name">Nom *</Label>
              <Input
                id="crm-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-company">Societe</Label>
              <Input
                id="crm-company"
                value={form.company ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-email">Email</Label>
              <Input
                id="crm-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-phone">Telephone</Label>
              <Input
                id="crm-phone"
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crm-needs">Besoins *</Label>
            <Textarea
              id="crm-needs"
              placeholder="Ex: boites imprimantes, 200 unites"
              value={form.needs}
              onChange={(e) => setForm((prev) => ({ ...prev, needs: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="crm-status">Statut</Label>
              <select
                id="crm-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as ClientStatus,
                  }))
                }
              >
                {CLIENT_STATUSES.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-estimated-value">Valeur estimee</Label>
              <Input
                id="crm-estimated-value"
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedValue ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    estimatedValue: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
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
