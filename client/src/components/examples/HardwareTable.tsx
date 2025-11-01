import { HardwareTable } from "../HardwareTable";

export default function HardwareTableExample() {
  const mockData = [
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
      quantity: 3,
      buyPrice: 680,
      sellPrice: 2100,
      netValue: 1420,
      totalValue: 4200,
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
  ];

  return (
    <div className="p-4">
      <HardwareTable data={mockData} showStock={true} />
    </div>
  );
}
