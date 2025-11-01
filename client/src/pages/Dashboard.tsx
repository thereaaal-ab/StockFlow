import { StatCard } from "@/components/StatCard";
import { InventoryChart } from "@/components/InventoryChart";
import { Package, Warehouse, Users, Euro } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const clientData = [
    { name: "SameSame", value: 12500 },
    { name: "O'Comptoir", value: 8200 },
    { name: "CuzCup", value: 18900 },
    { name: "GameSame", value: 6700 },
  ];

  const recentMovements = [
    {
      date: "2025-01-11",
      type: "Achat",
      product: "Kiosk 27",
      quantity: 3,
      client: "-",
    },
    {
      date: "2025-01-10",
      type: "Attribution",
      product: "Tablette 11 pouces",
      quantity: 2,
      client: "SameSame",
    },
    {
      date: "2025-01-09",
      type: "Retour",
      product: "Biper FSK",
      quantity: 1,
      client: "CuzCup",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre inventaire matériel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Matériel"
          value="142"
          icon={Package}
          trend={{ value: "+12%", isPositive: true }}
          testId="card-total-hardware"
        />
        <StatCard
          title="Stock Disponible"
          value="45"
          icon={Warehouse}
          trend={{ value: "-5%", isPositive: false }}
          testId="card-available-stock"
        />
        <StatCard
          title="Clients Actifs"
          value="8"
          icon={Users}
          testId="card-active-clients"
        />
        <StatCard
          title="Valeur Totale"
          value="46,600 €"
          icon={Euro}
          trend={{ value: "+18%", isPositive: true }}
          testId="card-total-value"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryChart
          title="Valeur par Client"
          data={clientData}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mouvements Récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead>Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map((movement, index) => (
                    <TableRow key={index} data-testid={`row-movement-${index}`}>
                      <TableCell className="text-sm">{movement.date}</TableCell>
                      <TableCell className="text-sm">{movement.type}</TableCell>
                      <TableCell className="text-sm font-medium">{movement.product}</TableCell>
                      <TableCell className="text-right text-sm">{movement.quantity}</TableCell>
                      <TableCell className="text-sm">{movement.client}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
