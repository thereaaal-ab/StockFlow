import { InventoryChart } from "../InventoryChart";

export default function InventoryChartExample() {
  const mockData = [
    { name: "SameSame", value: 12500 },
    { name: "O'Comptoir", value: 8200 },
    { name: "CuzCup", value: 18900 },
    { name: "GameSame", value: 6700 },
  ];

  return (
    <div className="p-4">
      <InventoryChart
        title="Valeur par Client"
        data={mockData}
      />
    </div>
  );
}
