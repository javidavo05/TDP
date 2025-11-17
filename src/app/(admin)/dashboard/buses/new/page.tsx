"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBusWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
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
    // TODO: Implement bus creation
    router.push("/dashboard/buses");
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

          <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-md">
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
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Año</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Capacidad *</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Editor de Asientos</h2>
                <div className="bg-muted p-8 rounded-lg text-center">
                  <p className="text-muted-foreground mb-4">
                    Editor visual de asientos (drag & drop)
                  </p>
                  <p className="text-sm">
                    Esta funcionalidad permitirá diseñar el layout de asientos del bus
                  </p>
                </div>
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
                    className="w-full p-2 border rounded"
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
                <h2 className="text-xl font-semibold mb-4">Resumen</h2>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p><strong>Placa:</strong> {formData.plateNumber}</p>
                  <p><strong>Modelo:</strong> {formData.model || "N/A"}</p>
                  <p><strong>Capacidad:</strong> {formData.capacity}</p>
                  <p><strong>Clase:</strong> {formData.busClass}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2 border rounded hover:bg-muted"
                >
                  Anterior
                </button>
              )}
              <div className="ml-auto">
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
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

