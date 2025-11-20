"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewRoutePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    origin: "",
    destination: "",
    basePrice: "",
    distanceKm: "",
    estimatedDurationMinutes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          origin: formData.origin,
          destination: formData.destination,
          basePrice: parseFloat(formData.basePrice),
          distanceKm: formData.distanceKm ? parseFloat(formData.distanceKm) : undefined,
          estimatedDurationMinutes: formData.estimatedDurationMinutes
            ? parseInt(formData.estimatedDurationMinutes)
            : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/dashboard/routes/${data.route.id}`);
      } else {
        alert(`Error: ${data.error || "Error al crear la ruta"}`);
      }
    } catch (error) {
      console.error("Error creating route:", error);
      alert("Error al crear la ruta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/routes"
            className="text-primary hover:text-primary-dark mb-2 inline-block"
          >
            ← Volver a Rutas
          </Link>
          <h1 className="text-3xl font-bold mb-2">Nueva Ruta</h1>
          <p className="text-muted-foreground">Crea una nueva ruta de transporte</p>
        </div>

        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de la Ruta *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Panamá - David"
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Origen *</label>
                <input
                  type="text"
                  required
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  placeholder="Ej: Ciudad de Panamá"
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Destino *</label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="Ej: David, Chiriquí"
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Precio Base (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                placeholder="25.00"
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Distancia (km)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.distanceKm}
                  onChange={(e) => setFormData({ ...formData, distanceKm: e.target.value })}
                  placeholder="450"
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duración Estimada (minutos)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.estimatedDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: e.target.value })}
                  placeholder="360"
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Ruta"}
              </button>
              <Link
                href="/dashboard/routes"
                className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
