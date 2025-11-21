"use client";

interface SeatLegendProps {
  className?: string;
}

export function SeatLegend({ className = "" }: SeatLegendProps) {
  const legendItems = [
    {
      label: "Disponible",
      color: "bg-green-500",
      description: "Asiento disponible para venta",
    },
    {
      label: "Vendido",
      color: "bg-red-500",
      description: "Asiento ya vendido",
    },
    {
      label: "Seleccionado",
      color: "bg-blue-500",
      description: "Asiento seleccionado actualmente",
    },
    {
      label: "Discapacidad",
      color: "bg-yellow-500",
      description: "Asiento para personas con discapacidad",
    },
    {
      label: "Pasillo",
      color: "bg-gray-400",
      description: "Pasillo",
    },
    {
      label: "Escalera",
      color: "bg-orange-500",
      description: "Escalera",
    },
    {
      label: "Baño",
      color: "bg-cyan-500",
      description: "Baño",
    },
  ];

  return (
    <div className={`bg-card border-2 border-border rounded-xl p-4 ${className}`}>
      <h3 className="text-lg font-bold mb-3">Leyenda de Asientos</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded ${item.color} border-2 border-border flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

