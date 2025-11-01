import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Package, Euro } from "lucide-react";

interface ClientCardProps {
  name: string;
  hardwareCount: number;
  totalValue: number;
  onViewDetails: () => void;
}

export function ClientCard({ name, hardwareCount, totalValue, onViewDetails }: ClientCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Card className="hover-elevate" data-testid={`card-client-${name.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span>{name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Matériel</span>
            </div>
            <p className="text-2xl font-bold">{hardwareCount}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Euro className="h-4 w-4" />
              <span>Valeur</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        <Button
          className="w-full"
          variant="outline"
          onClick={onViewDetails}
          data-testid="button-view-details"
        >
          Voir Détails
        </Button>
      </CardContent>
    </Card>
  );
}
