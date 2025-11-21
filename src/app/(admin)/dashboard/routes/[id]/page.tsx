"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number | null;
  estimatedDurationMinutes: number | null;
  basePrice: number;
  isExpress: boolean;
  expressPriceMultiplier: number;
  isActive: boolean;
}

interface RouteStop {
  id: string;
  name: string;
  kmPosition: number;
  orderIndex: number;
  price: number; // Complete ticket price for this stop
}

export default function EditRoutePage() {
  const params = useParams();
  const router = useRouter();
  const [route, setRoute] = useState<Route | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    origin: "",
    destination: "",
    basePrice: "",
    distanceKm: "",
    estimatedDurationMinutes: "",
    isExpress: false,
    expressPriceMultiplier: "1.2",
    isActive: true,
  });
  const [newStop, setNewStop] = useState({
    name: "",
    kmPosition: "",
    price: "0", // Complete ticket price for this stop
  });

  useEffect(() => {
    if (params.id) {
      fetchRoute();
    }
  }, [params.id]);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/routes/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setRoute(data.route);
        setStops(data.stops || []);
        setFormData({
          name: data.route.name,
          origin: data.route.origin,
          destination: data.route.destination,
          basePrice: data.route.basePrice.toString(),
          distanceKm: data.route.distanceKm?.toString() || "",
          estimatedDurationMinutes: data.route.estimatedDurationMinutes?.toString() || "",
          isExpress: data.route.isExpress || false,
          expressPriceMultiplier: data.route.expressPriceMultiplier?.toString() || "1.2",
          isActive: data.route.isActive,
        });
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/routes/${params.id}`, {
        method: "PUT",
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
          isExpress: formData.isExpress,
          expressPriceMultiplier: parseFloat(formData.expressPriceMultiplier),
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Ruta actualizada exitosamente");
        fetchRoute();
      } else {
        alert(`Error: ${data.error || "Error al actualizar la ruta"}`);
      }
    } catch (error) {
      console.error("Error updating route:", error);
      alert("Error al actualizar la ruta");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStop = async () => {
    if (!newStop.name || !newStop.kmPosition) {
      alert("Por favor completa nombre y posición en km");
      return;
    }

    try {
      const response = await fetch(`/api/admin/routes/${params.id}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStop.name,
          kmPosition: parseFloat(newStop.kmPosition),
          orderIndex: stops.length,
          price: parseFloat(newStop.price), // Complete ticket price for this stop
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewStop({ name: "", kmPosition: "", price: "0" });
        fetchRoute();
      } else {
        alert(`Error: ${data.error || "Error al agregar parada"}`);
      }
    } catch (error) {
      console.error("Error adding stop:", error);
      alert("Error al agregar parada");
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta parada?")) return;

    try {
      const response = await fetch(`/api/admin/routes/${params.id}/stops/${stopId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchRoute();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Error al eliminar la parada"}`);
      }
    } catch (error) {
      console.error("Error deleting stop:", error);
      alert("Error al eliminar la parada");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">Ruta no encontrada</div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold mb-2">Editar Ruta</h1>
          <p className="text-muted-foreground">{route.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Info */}
          <div className="space-y-6">
            <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
              <h2 className="text-xl font-semibold">Información de la Ruta</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Nombre de la Ruta *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Duración (minutos)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isExpress}
                      onChange={(e) => setFormData({ ...formData, isExpress: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Ruta Expreso</span>
                  </label>
                  <p className="text-xs text-muted-foreground ml-6 mt-1">
                    Las rutas expreso tienen un precio multiplicado para servicios sin paradas intermedias
                  </p>
                </div>
                {formData.isExpress && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Multiplicador de Precio Expreso
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={formData.expressPriceMultiplier}
                      onChange={(e) => setFormData({ ...formData, expressPriceMultiplier: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      El precio base se multiplicará por este valor para servicios expreso
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Ruta Activa
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </form>
          </div>

          {/* Route Stops */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Paradas de la Ruta</h2>

              {/* Add New Stop */}
              <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold text-sm">Agregar Nueva Parada</h3>
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newStop.name}
                    onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
                    placeholder="Ej: Santiago"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Km Posición</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newStop.kmPosition}
                      onChange={(e) => setNewStop({ ...newStop, kmPosition: e.target.value })}
                      placeholder="225.5"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Precio Completo del Boleto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newStop.price}
                      onChange={(e) => setNewStop({ ...newStop, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddStop}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors text-sm font-semibold"
                >
                  Agregar Parada
                </button>
              </div>

              {/* Stops List */}
              {stops.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay paradas registradas
                </div>
              ) : (
                <div className="space-y-2">
                  {stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="p-3 bg-muted/50 rounded-lg border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm">{stop.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {stop.kmPosition} km • Precio: ${stop.price.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStop(stop.id)}
                        className="text-destructive hover:text-destructive/80 text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
