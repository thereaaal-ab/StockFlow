import { HardwareTable } from "@/components/HardwareTable";
import { AddHardwareDialog } from "@/components/AddHardwareDialog";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function HardwareTotal() {
  const [searchTerm, setSearchTerm] = useState("");

  const hardwareData = [
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
      quantity: 0,
      buyPrice: 680,
      sellPrice: 2100,
      netValue: 1420,
      totalValue: 0,
    },
    {
      code: "AKSP-32",
      name: "Kiosk 32",
      quantity: 3,
      buyPrice: 800,
      sellPrice: 2799.99,
      netValue: 1999.99,
      totalValue: 8399.97,
    },
    {
      code: "PW-02",
      name: "Imprimante",
      quantity: 2,
      buyPrice: 80,
      sellPrice: 179.88,
      netValue: 99.88,
      totalValue: 359.76,
    },
    {
      code: "AT-11",
      name: "Tablette 11 pouces",
      quantity: 1,
      buyPrice: 135,
      sellPrice: 249.99,
      netValue: 114.99,
      totalValue: 249.99,
    },
    {
      code: "BFSK-01",
      name: "Télécommande Biper",
      quantity: 4,
      buyPrice: 19,
      sellPrice: 24.99,
      netValue: 5.99,
      totalValue: 24.99,
    },
    {
      code: "BFSK-02",
      name: "Base de charge Biper",
      quantity: 4,
      buyPrice: 10,
      sellPrice: 19.99,
      netValue: 9.99,
      totalValue: 79.96,
    },
    {
      code: "BFSK-03",
      name: "Biper FSK",
      quantity: 40,
      buyPrice: 3,
      sellPrice: 8.09,
      netValue: 5.09,
      totalValue: 323.6,
    },
    {
      code: "SN-1",
      name: "SNIIP Licence",
      quantity: 7,
      buyPrice: 0,
      sellPrice: 79.99,
      netValue: 79.99,
      totalValue: 559.93,
    },
  ];

  const filteredData = hardwareData.filter(
    (item) =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Hardware Total
          </h1>
          <p className="text-muted-foreground mt-1">
            Catalogue complet de tout le matériel acheté
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <AddHardwareDialog />
        </div>
      </div>

      <div className="flex items-center gap-4">
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
      </div>

      <HardwareTable data={filteredData} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Total: {filteredData.length} produits</div>
        <div>
          Investissement total:{" "}
          <span className="font-semibold text-foreground">5,734.00 €</span>
        </div>
      </div>
    </div>
  );
}
