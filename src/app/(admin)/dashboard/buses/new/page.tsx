"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeatMapEditor } from "@/components/bus/SeatMapEditor";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  row: number;
  column: number;
}

export default function NewBusWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [formData, setFormData] = useState({
    plateNumber: "",
    model: "",
    year: "",
    capacity: "",
    busClass: "economico" as string,
    features: {
      wifi: false,
      ac: false,
      bathroom: false,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (seats.length === 0) {
      alert("Debes crear al menos un asiento en el paso 2");
      setStep(2);
      return;
    }

    try {
      const response = await fetch("/api/admin/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: formData.plateNumber,
          model: formData.model,
          year: formData.year ? parseInt(formData.year) : null,
          capacity: parseInt(formData.capacity),
          busClass: formData.busClass,
          features: formData.features,
          seatMap: {
            seats: seats.map((seat) => ({
              id: seat.id,
              number: seat.number,
              x: seat.x,
              y: seat.y,
              type: seat.type,
              row: seat.row,
              column: seat.column,
            })),
          },
        }),
      });

      if (response.ok) {
        router.push("/dashboard/buses");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Error al crear el bus"}`);
      }
    } catch (error) {
      console.error("Error creating bus:", error);
      alert("Error al crear el bus");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Crear Nuevo Bus</h1>

        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= s ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > s ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-lg">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Placa *</label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Año</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Capacidad *</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Editor Visual de Asientos</h2>
                  <div className="text-sm text-muted-foreground">
                    {seats.length} asientos creados
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <SeatMapEditor
                    initialSeats={seats}
                    onSeatsChange={setSeats}
                  />
                </div>
                {seats.length === 0 && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                    <p className="text-sm text-warning">
                      ⚠️ Debes crear al menos un asiento para continuar
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Características</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Clase de Bus</label>
                  <select
                    value={formData.busClass}
                    onChange={(e) => setFormData({ ...formData, busClass: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="economico">Económico</option>
                    <option value="ejecutivo">Ejecutivo</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Servicios</label>
                  {["wifi", "ac", "bathroom"].map((feature) => (
                    <label key={feature} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.features[feature as keyof typeof formData.features]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            features: {
                              ...formData.features,
                              [feature]: e.target.checked,
                            },
                          })
                        }
                      />
                      <span className="capitalize">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Resumen y Confirmación</h2>
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Placa</p>
                      <p className="font-semibold">{formData.plateNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Modelo</p>
                      <p className="font-semibold">{formData.model || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Año</p>
                      <p className="font-semibold">{formData.year || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Capacidad</p>
                      <p className="font-semibold">{formData.capacity} asientos</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Clase</p>
                      <p className="font-semibold capitalize">{formData.busClass}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Asientos Configurados</p>
                      <p className="font-semibold">{seats.length}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Servicios</p>
                    <div className="flex gap-2">
                      {formData.features.wifi && (
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">WiFi</span>
                      )}
                      {formData.features.ac && (
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">A/C</span>
                      )}
                      {formData.features.bathroom && (
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">Baño</span>
                      )}
                      {!formData.features.wifi && !formData.features.ac && !formData.features.bathroom && (
                        <span className="text-sm text-muted-foreground">Ninguno</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Anterior
                </button>
              )}
              <div className="ml-auto">
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 2 && seats.length === 0) {
                        alert("Debes crear al menos un asiento para continuar");
                        return;
                      }
                      setStep(step + 1);
                    }}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors font-semibold"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors font-semibold"
                  >
                    Crear Bus
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

