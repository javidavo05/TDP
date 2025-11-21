"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { SeatMapEditor } from "@/components/bus/SeatMapEditor";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

type SeatType = "single" | "double" | "aisle" | "disabled" | "extra_space" | "stair" | "bathroom";

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: SeatType;
  row: number;
  column: number;
  floor: number;
}

interface Bus {
  id: string;
  plateNumber: string;
  unitNumber: string | null;
  model: string | null;
  year: number | null;
  capacity: number;
  busClass: string;
  features: {
    wifi: boolean;
    ac: boolean;
    bathroom: boolean;
  };
  mechanicalNotes: string | null;
  seatMap: {
    seats: Array<Seat & { floor?: number }>;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  odometer?: number;
  totalDistanceTraveled?: number;
  lastTripDate?: string | null;
}

export default function BusDetailPage() {
  const router = useRouter();
  const params = useParams();
  const busId = params.id as string;

  const [bus, setBus] = useState<Bus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "seats" | "history">("info");
  const [assignmentChanges, setAssignmentChanges] = useState<any[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);

  const [formData, setFormData] = useState({
    plateNumber: "",
    unitNumber: "",
    model: "",
    year: "",
    capacity: "",
    busClass: "economico",
    features: {
      wifi: false,
      ac: false,
      bathroom: false,
    },
    mechanicalNotes: "",
    isActive: true,
    odometer: "",
  });

  useEffect(() => {
    if (busId) {
      fetchBus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId]);

  useEffect(() => {
    if (bus) {
      setFormData({
        plateNumber: bus.plateNumber || "",
        unitNumber: bus.unitNumber || "",
        model: bus.model || "",
        year: bus.year?.toString() || "",
        capacity: bus.capacity.toString(),
        busClass: bus.busClass || "economico",
        features: bus.features || { wifi: false, ac: false, bathroom: false },
        mechanicalNotes: bus.mechanicalNotes || "",
        isActive: bus.isActive,
        odometer: bus.odometer?.toString() || "0",
      });
      if (bus.seatMap?.seats) {
        // Ensure all seats have floor property
        setSeats(bus.seatMap.seats.map(seat => ({
          ...seat,
          floor: seat.floor || 1
        })));
      }
      if (bus.seatMap && 'visualLayout' in bus.seatMap && bus.seatMap.visualLayout) {
        setLayout(bus.seatMap.visualLayout as any);
      }
      fetchAssignmentChanges();
    }
  }, [bus]);

  const fetchBus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/buses/${busId}`);
      const data = await response.json();

      if (response.ok) {
        setBus(data.bus);
      } else {
        setError(data.error || "Error al cargar el bus");
      }
    } catch (error) {
      console.error("Error fetching bus:", error);
      setError("Error al cargar el bus");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentChanges = async () => {
    if (!busId) return;
    try {
      setLoadingChanges(true);
      const response = await fetch(`/api/admin/buses/${busId}/assignment-changes`);
      const data = await response.json();
      if (response.ok) {
        setAssignmentChanges(data.changes || []);
      }
    } catch (error) {
      console.error("Error fetching assignment changes:", error);
    } finally {
      setLoadingChanges(false);
    }
  };

  const handleSeatsChange = (newSeats: Seat[]) => {
    setSeats(newSeats);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updateData = {
        plateNumber: formData.plateNumber,
        unitNumber: formData.unitNumber || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        capacity: parseInt(formData.capacity),
        busClass: formData.busClass,
        features: formData.features,
        mechanicalNotes: formData.mechanicalNotes || null,
        odometer: formData.odometer ? parseFloat(formData.odometer) : 0,
        seatMap: {
          seats: seats.map((seat) => ({
            id: seat.id,
            number: seat.number,
            x: seat.x,
            y: seat.y,
            type: seat.type,
            row: seat.row,
            column: seat.column,
            floor: seat.floor || 1,
          })),
        },
        isActive: formData.isActive,
      };

      const response = await fetch(`/api/admin/buses/${busId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        setBus(data.bus);
        alert("Bus actualizado exitosamente");
        router.refresh();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al actualizar el bus");
      }
    } catch (error) {
      console.error("Error updating bus:", error);
      setError("Error al actualizar el bus");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando bus...</p>
        </div>
      </div>
    );
  }

  if (error && !bus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link
            href="/dashboard/buses"
            className="text-primary hover:underline"
          >
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  if (!bus) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/buses"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Bus: {bus.plateNumber}</h1>
              <p className="text-muted-foreground">
                {bus.unitNumber && `Unidad: ${bus.unitNumber} • `}
                {bus.model && `${bus.model} `}
                {bus.year && `(${bus.year})`}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "info"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Información General
            </button>
            <button
              onClick={() => setActiveTab("seats")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "seats"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mapa de Asientos
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                fetchAssignmentChanges();
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "history"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Historial de Cambios
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "info" && (
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg space-y-6">
            <h2 className="text-2xl font-semibold mb-6">Información del Bus</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Placa *</label>
                <input
                  type="text"
                  required
                  value={formData.plateNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, plateNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Número de Unidad
                </label>
                <input
                  type="text"
                  value={formData.unitNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, unitNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: UN-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Modelo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Año</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacidad *
                </label>
                <input
                  type="number"
                  required
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Odómetro Actual (km) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.odometer}
                  onChange={(e) =>
                    setFormData({ ...formData, odometer: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kilometraje actual del bus. Puede ser actualizado manualmente.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Clase</label>
                <select
                  value={formData.busClass}
                  onChange={(e) =>
                    setFormData({ ...formData, busClass: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="economico">Económico</option>
                  <option value="ejecutivo">Ejecutivo</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Características</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.features.wifi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, wifi: e.target.checked },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span>WiFi</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.features.ac}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, ac: e.target.checked },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span>Aire Acondicionado</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.features.bathroom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: {
                          ...formData.features,
                          bathroom: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span>Baño</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Notas Mecánicas
              </label>
              <textarea
                value={formData.mechanicalNotes}
                onChange={(e) =>
                  setFormData({ ...formData, mechanicalNotes: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Anotaciones sobre mantenimiento, reparaciones, etc."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span>Bus Activo</span>
              </label>
            </div>

            {/* Odometer and Distance Information */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Kilometraje y Distancia</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Odómetro Actual</p>
                  <p className="text-2xl font-bold">
                    {bus.odometer !== undefined ? `${bus.odometer.toFixed(2)} km` : "N/A"}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Distancia Total Recorrida</p>
                  <p className="text-2xl font-bold">
                    {bus.totalDistanceTraveled !== undefined 
                      ? `${bus.totalDistanceTraveled.toFixed(2)} km` 
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Último Viaje</p>
                  <p className="text-lg font-semibold">
                    {bus.lastTripDate 
                      ? new Date(bus.lastTripDate).toLocaleString('es-PA', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      : "Sin viajes"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Creado: {new Date(bus.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Última actualización: {new Date(bus.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Historial de Cambios de Asignación</h2>
            {loadingChanges ? (
              <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
            ) : assignmentChanges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cambios registrados para este bus
              </div>
            ) : (
              <div className="space-y-4">
                {assignmentChanges.map((change: any) => (
                  <div
                    key={change.id}
                    className="p-4 border border-border rounded-lg bg-background"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">Cambio de Bus</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(change.changedAt).toLocaleString("es-PA", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          {change.oldBus ? (
                            <p>
                              <span className="text-muted-foreground">Bus anterior:</span>{" "}
                              <span className="font-medium">
                                {change.oldBus.plateNumber}
                                {change.oldBus.unitNumber && ` (${change.oldBus.unitNumber})`}
                              </span>
                            </p>
                          ) : (
                            <p>
                              <span className="text-muted-foreground">Asignación inicial</span>
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">Bus nuevo:</span>{" "}
                            <span className="font-medium">
                              {change.newBus.plateNumber}
                              {change.newBus.unitNumber && ` (${change.newBus.unitNumber})`}
                            </span>
                          </p>
                          {change.assignment && (
                            <p>
                              <span className="text-muted-foreground">Horario:</span>{" "}
                              <span className="font-medium">
                                {change.assignment.hour?.toString().padStart(2, "0")}:00 -{" "}
                                {change.assignment.route?.origin} → {change.assignment.route?.destination}
                                {change.assignment.isExpress && " (Expreso)"}
                              </span>
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">Razón:</span>{" "}
                            <span className="font-medium">{change.reason}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Cambiado por:</span>{" "}
                            <span className="font-medium">
                              {change.changedBy.name || change.changedBy.email}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "seats" && (
          <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Editor de Mapa de Asientos</h2>
            <SeatMapEditor
              initialSeats={seats.map(s => ({ ...s, floor: s.floor || 1 })) as any}
              onSeatsChange={(newSeats: any) => {
                setSeats(newSeats.map((s: any) => ({ ...s, floor: s.floor || 1 })));
              }}
              initialLayout={layout}
              onLayoutChange={setLayout}
            />
          </div>
        )}
      </div>
    </div>
  );
}

