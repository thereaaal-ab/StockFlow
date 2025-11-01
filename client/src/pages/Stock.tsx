import { HardwareTable } from "@/components/HardwareTable";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const stockData = [
    {
      code: "AKSP-21",
      name: "Kiosk 21.5",
      quantity: 0,
      buyPrice: 500,
      sellPrice: 1699.99,
      netValue: 1199.99,
      totalValue: 0,
    },
    {
      code: "AKSP-27",
      name: "Kiosk 27",
      quantity: 2,
      buyPrice: 680,
      sellPrice: 2100,
      netValue: 1420,
      totalValue: 4200,
    },
    {
      code: "AKSP-32",
      name: "Kiosk 32",
      quantity: 0,
      buyPrice: 800,
      sellPrice: 2799.99,
      netValue: 1999.99,
      totalValue: 0,
    },
    {
      code: "PW-02",
      name: "Imprimante",
      quantity: 0,
      buyPrice: 80,
      sellPrice: 179.88,
      netValue: 99.88,
      totalValue: 0,
    },
    {
      code: "AT-11",
      name: "Tablette 11 pouces",
      quantity: 0,
      buyPrice: 135,
      sellPrice: 249.99,
      netValue: 114.99,
      totalValue: 0,
    },
    {
      code: "BFSK-01",
      name: "Télécommande Biper",
      quantity: 0,
      buyPrice: 19,
      sellPrice: 24.99,
      netValue: 5.99,
      totalValue: 0,
    },
    {
      code: "BFSK-02",
      name: "Base de charge Biper",
      quantity: 0,
      buyPrice: 10,
      sellPrice: 19.99,
      netValue: 9.99,
      totalValue: 0,
    },
    {
      code: "BFSK-03",
      name: "Biper FSK",
      quantity: 0,
      buyPrice: 3,
      sellPrice: 8.09,
      netValue: 5.09,
      totalValue: 0,
    },
    {
      code: "SN-1",
      name: "SNIIP Licence",
      quantity: 0,
      buyPrice: 0,
      sellPrice: 79.99,
      netValue: 79.99,
      totalValue: 0,
    },
  ];

  const getFilteredData = () => {
    let filtered = stockData.filter(
      (item) =>
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (statusFilter === "in-stock") {
      filtered = filtered.filter((item) => item.quantity > 0);
    } else if (statusFilter === "out-of-stock") {
      filtered = filtered.filter((item) => item.quantity === 0);
    } else if (statusFilter === "low-stock") {
      filtered = filtered.filter((item) => item.quantity > 0 && item.quantity < 5);
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Stock Actuel
          </h1>
          <p className="text-muted-foreground mt-1">
            Inventaire en temps réel des disponibilités
          </p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par code ou nom..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="in-stock">En stock</SelectItem>
            <SelectItem value="low-stock">Stock bas</SelectItem>
            <SelectItem value="out-of-stock">Rupture</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <HardwareTable data={filteredData} showStock={true} showActions={false} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Total: {filteredData.length} produits</div>
        <div>
          Valeur stock disponible:{" "}
          <span className="font-semibold text-foreground">2,840.00 €</span>
        </div>
      </div>
    </div>
  );
}
