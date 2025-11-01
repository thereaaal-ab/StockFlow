import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HardwareItem {
  code: string;
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  netValue: number;
  totalValue: number;
}

interface HardwareTableProps {
  data: HardwareItem[];
  showActions?: boolean;
  showStock?: boolean;
}

export function HardwareTable({ data, showActions = true, showStock = false }: HardwareTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Rupture", variant: "destructive" as const };
    if (quantity < 5) return { label: "Stock bas", variant: "secondary" as const };
    return { label: "En stock", variant: "default" as const };
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Code Produit</TableHead>
            <TableHead>Nom Produit</TableHead>
            <TableHead className="w-24 text-right">Quantité</TableHead>
            {showStock && <TableHead className="w-32">Statut</TableHead>}
            <TableHead className="w-32 text-right">Prix Achat</TableHead>
            <TableHead className="w-32 text-right">Prix Vente</TableHead>
            <TableHead className="w-32 text-right">Valeur Nette</TableHead>
            <TableHead className="w-32 text-right">Valeur Totale</TableHead>
            {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? (showStock ? 9 : 8) : (showStock ? 8 : 7)}
                className="h-24 text-center text-muted-foreground"
              >
                Aucun matériel trouvé
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const status = showStock ? getStockStatus(item.quantity) : null;
              return (
                <TableRow key={item.code} data-testid={`row-hardware-${index}`}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  {showStock && status && (
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">{formatCurrency(item.buyPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.sellPrice)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.netValue)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.totalValue)}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-edit-${index}`}
                          onClick={() => console.log("Edit", item.code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-delete-${index}`}
                          onClick={() => console.log("Delete", item.code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
