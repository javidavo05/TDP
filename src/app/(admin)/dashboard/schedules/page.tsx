"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Schedule {
  id: string;
  routeId: string;
  hour: number;
  isExpress: boolean;
  expressPriceMultiplier: number;
  isActive: boolean;
}

interface Bus {
  id: string;
  plateNumber: string;
  unitNumber: string | null;
  capacity: number;
  isActive: boolean;
  lastTripDate?: string | null;
}

interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  busId: string;
  date: string;
}

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

export default function SchedulesPage() {
  // Initialize with today's date, ensuring it's valid
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayDate());
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [trips, setTrips] = useState<Array<{ scheduleId: string; hour: number; tripId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [draggedBus, setDraggedBus] = useState<Bus | null>(null);
  const [dragOverScheduleId, setDragOverScheduleId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [selectedRouteForHour, setSelectedRouteForHour] = useState<Record<number, string>>({});
  const [selectedScheduleForHour, setSelectedScheduleForHour] = useState<Record<number, string>>({});
  const [modifyingAssignment, setModifyingAssignment] = useState<ScheduleAssignment | null>(null);
  const [modifyReason, setModifyReason] = useState("");
  const [selectedNewBusId, setSelectedNewBusId] = useState<string>("");

  useEffect(() => {
    fetchRoutes();
    fetchBuses();
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      fetchSchedules();
      fetchAssignments();
    }
  }, [selectedRoute, selectedDate]);

  // Fetch trips after schedules are loaded
  useEffect(() => {
    if (selectedRoute && schedules.length > 0) {
      fetchTrips();
    }
  }, [selectedRoute, selectedDate, schedules]);

  // Close any open editing when date changes
  useEffect(() => {
    setEditingScheduleId(null);
    setEditingHour(null);
    setDragOverScheduleId(null);
    setSelectedRouteForHour({});
    setSelectedScheduleForHour({});
  }, [selectedDate]);

  const fetchRoutes = async () => {
    try {
      const response = await fetch("/api/admin/routes");
      const data = await response.json();
      if (response.ok) {
        // API returns PaginatedResponse with 'data' property
        const routesData = data.data || data.routes || [];
        setRoutes(routesData);
        console.log("Routes loaded:", routesData.length, routesData);
        if (routesData.length > 0 && !selectedRoute) {
          setSelectedRoute(routesData[0].id);
        }
      } else {
        console.error("Error fetching routes:", data.error);
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedRoute) return;
    try {
      const response = await fetch(`/api/admin/schedules?routeId=${selectedRoute}`);
      const data = await response.json();
      if (response.ok) {
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await fetch("/api/admin/buses");
      const data = await response.json();
      if (response.ok) {
        setBuses((data.buses || []).filter((b: Bus) => b.isActive));
      }
    } catch (error) {
      console.error("Error fetching buses:", error);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedRoute) return;
    if (!selectedDate || isNaN(selectedDate.getTime())) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const response = await fetch(
        `/api/admin/schedules/assignments?startDate=${dateStr}&endDate=${dateStr}`
      );
      const data = await response.json();
      if (response.ok) {
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  };

  const fetchTrips = async () => {
    if (!selectedRoute) return;
    if (!selectedDate || isNaN(selectedDate.getTime())) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      // Get trips for the selected date and route
      const response = await fetch(`/api/admin/trips?date=${dateStr}&routeId=${selectedRoute}`);
      const data = await response.json();
      if (response.ok) {
        // Map trips to schedules by matching hour and route
        const tripsData = data.trips || [];
        const tripsBySchedule = tripsData.map((trip: any) => {
          const departureTime = new Date(trip.departureTime);
          const hour = departureTime.getUTCHours();
          // Find matching schedule - use current schedules state
          const schedule = schedules.find(s => s.hour === hour && s.routeId === selectedRoute);
          return {
            scheduleId: schedule?.id || "",
            hour,
            tripId: trip.id,
          };
        }).filter((t: any) => t.scheduleId);
        setTrips(tripsBySchedule);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, bus: Bus) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bus.id);
    e.dataTransfer.setData("application/json", JSON.stringify(bus));
    setDraggedBus(bus);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedBus(null);
    setDragOverScheduleId(null);
  };

  const handleDragOver = (e: React.DragEvent, scheduleId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (scheduleId) {
      setDragOverScheduleId(scheduleId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverScheduleId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, scheduleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedBus) {
      // Try to get from dataTransfer as fallback
      try {
        const busData = e.dataTransfer.getData("application/json");
        if (busData) {
          const bus = JSON.parse(busData) as Bus;
          await performAssignment(scheduleId, bus.id);
        }
      } catch (error) {
        console.error("Error parsing drag data:", error);
      }
      return;
    }

    await performAssignment(scheduleId, draggedBus.id);
  };

  const handleCreateScheduleAndAssign = async (hour: number, busId: string) => {
    const routeId = selectedRouteForHour[hour] || selectedRoute;
    if (!routeId) {
      alert("Por favor selecciona una ruta primero");
      return;
    }

    if (!selectedDate || isNaN(selectedDate.getTime())) {
      alert("Fecha inválida");
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      // First, create the schedule
      const scheduleResponse = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: routeId,
          hour: hour,
          isExpress: false, // Default to normal, can be changed later
          expressPriceMultiplier: 1.0,
        }),
      });

      if (!scheduleResponse.ok) {
        const error = await scheduleResponse.json();
        // If schedule already exists, try to get it
        if (error.error?.includes("already exists") || error.error?.includes("unique")) {
          // Fetch existing schedules and find the one for this hour
          await fetchSchedules();
          const existingSchedule = schedules.find(s => s.hour === hour && s.routeId === routeId);
          if (existingSchedule) {
            await performAssignment(existingSchedule.id, busId);
            setEditingScheduleId(existingSchedule.id);
            setEditingHour(null);
            return;
          }
        }
        alert(error.error || "Error al crear horario");
        return;
      }

      const scheduleData = await scheduleResponse.json();
      const newScheduleId = scheduleData.schedule.id;

      // Refresh schedules list
      await fetchSchedules();

      // Now assign the bus
      await performAssignment(newScheduleId, busId);
      
      // Update editing state to use the new schedule ID
      setEditingScheduleId(newScheduleId);
      setEditingHour(null);
    } catch (error) {
      console.error("Error creating schedule and assigning bus:", error);
      alert("Error al crear horario y asignar bus");
    }
  };

  const performAssignment = async (scheduleId: string, busId: string) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      alert("Fecha inválida");
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const response = await fetch("/api/admin/schedules/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          busId,
          date: dateStr,
        }),
      });

      if (response.ok) {
        await fetchAssignments();
        setDraggedBus(null);
        setDragOverScheduleId(null);
        // Show success feedback
        const bus = buses.find(b => b.id === busId);
        if (bus) {
          // Visual feedback - could add toast notification here
          console.log(`Bus ${bus.plateNumber} asignado exitosamente`);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Error al asignar bus");
      }
    } catch (error) {
      console.error("Error assigning bus:", error);
      alert("Error al asignar bus");
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/admin/schedules/assignments?id=${assignmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchAssignments();
      } else {
        alert("Error al remover asignación");
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      alert("Error al remover asignación");
    }
  };

  const handleModifyAssignment = (assignment: ScheduleAssignment) => {
    setModifyingAssignment(assignment);
    setModifyReason("");
    setSelectedNewBusId("");
  };

  const handleSaveModification = async () => {
    if (!modifyingAssignment || !selectedNewBusId || !modifyReason.trim()) {
      alert("Por favor completa todos los campos");
      return;
    }

    try {
      const response = await fetch("/api/admin/schedules/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: modifyingAssignment.id,
          newBusId: selectedNewBusId,
          reason: modifyReason.trim(),
        }),
      });

      if (response.ok) {
        await fetchAssignments();
        setModifyingAssignment(null);
        setModifyReason("");
        setSelectedNewBusId("");
        alert("Bus modificado exitosamente");
      } else {
        const error = await response.json();
        alert(error.error || "Error al modificar asignación");
      }
    } catch (error) {
      console.error("Error modifying assignment:", error);
      alert("Error al modificar asignación");
    }
  };

  const handleGenerateTrips = async () => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      alert("Fecha inválida");
      return;
    }
    
    if (!confirm(`¿Generar trips para ${format(selectedDate, "PPP", { locale: es })}?`)) {
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const response = await fetch("/api/admin/schedules/generate-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      const data = await response.json();
      if (response.ok) {
        const created = data.summary?.created || data.trips?.length || 0;
        const skipped = data.summary?.skipped || 0;
        let message = `Se generaron ${created} trips exitosamente`;
        if (skipped > 0) {
          message += `\n${skipped} horarios fueron omitidos (sin bus asignado)`;
        }
        alert(message);
        // Refresh assignments and trips to show updated data
        await fetchAssignments();
        await fetchTrips();
      } else {
        alert(data.error || "Error al generar trips");
      }
    } catch (error) {
      console.error("Error generating trips:", error);
      alert("Error al generar trips");
    }
  };

  const getAssignmentsForSchedule = (scheduleId: string): ScheduleAssignment[] => {
    return assignments.filter((a) => a.scheduleId === scheduleId);
  };

  const getBusById = (busId: string): Bus | undefined => {
    return buses.find((b) => b.id === busId);
  };

  // Get trip status for a schedule
  const getScheduleTripStatus = (scheduleId: string | null, hour: number): "no-bus" | "bus-no-trip" | "trip-generated" => {
    if (!scheduleId) return "no-bus";
    
    const scheduleAssignments = getAssignmentsForSchedule(scheduleId);
    if (scheduleAssignments.length === 0) return "no-bus";
    
    const hasTrip = trips.some(t => t.scheduleId === scheduleId && t.hour === hour);
    if (hasTrip) return "trip-generated";
    
    return "bus-no-trip";
  };

  // Helper to get route name for a schedule
  const getRouteNameForSchedule = (scheduleId: string): string => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return "";
    const route = routes.find(r => r.id === schedule.routeId);
    return route ? `${route.origin} → ${route.destination}` : "";
  };

  // Generate all 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Asignación de Horarios</h1>
          <div className="flex gap-4 items-center">
            <select
              value={selectedRoute || ""}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="px-4 py-2 bg-card border border-input rounded-lg"
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.origin} → {route.destination}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={(() => {
                try {
                  if (selectedDate && !isNaN(selectedDate.getTime())) {
                    return format(selectedDate, "yyyy-MM-dd");
                  }
                } catch (error) {
                  console.error("Error formatting date:", error);
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return format(today, "yyyy-MM-dd");
              })()}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  // Parse the date string directly (YYYY-MM-DD format)
                  const [year, month, day] = value.split("-").map(Number);
                  const newDate = new Date(year, month - 1, day);
                  newDate.setHours(0, 0, 0, 0);
                  
                  if (!isNaN(newDate.getTime()) && newDate.getFullYear() === year) {
                    setSelectedDate(newDate);
                  } else {
                    console.error("Invalid date:", value);
                    // Reset to today if invalid
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setSelectedDate(today);
                  }
                }
              }}
              className="px-4 py-2 bg-card border border-input rounded-lg"
            />
            <button
              onClick={handleGenerateTrips}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
            >
              Generar Trips
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Schedules (Hours) */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Horarios (00:00 - 23:00)</h2>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {hours.map((hour) => {
                // Get all schedules for this hour (multiple routes possible)
                const hourSchedules = schedules.filter((s) => s.hour === hour);
                const hasSchedules = hourSchedules.length > 0;
                
                // Determine which schedule we're working with
                const activeScheduleId = selectedScheduleForHour[hour] || (hourSchedules.length === 1 ? hourSchedules[0].id : null);
                const activeSchedule = activeScheduleId ? hourSchedules.find(s => s.id === activeScheduleId) : null;
                
                const scheduleAssignments = activeSchedule
                  ? getAssignmentsForSchedule(activeSchedule.id)
                  : [];

                const isEditing = activeSchedule 
                  ? editingScheduleId === activeSchedule.id 
                  : editingHour === hour;
                const routeSelected = activeSchedule ? true : !!selectedRouteForHour[hour];
                const canDrop = isEditing && draggedBus && routeSelected;
                
                // Get trip status for visual feedback
                const tripStatus = getScheduleTripStatus(activeSchedule?.id || null, hour);

                return (
                  <div
                    key={hour}
                    onDragOver={(e) => {
                      if (canDrop) {
                        handleDragOver(e, activeSchedule?.id || null);
                      }
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={async (e) => {
                      if (canDrop && draggedBus && routeSelected) {
                        if (activeSchedule) {
                          await handleDrop(e, activeSchedule.id);
                        } else {
                          // Create schedule first, then assign bus
                          await handleCreateScheduleAndAssign(hour, draggedBus.id);
                        }
                      } else if (isEditing && !routeSelected) {
                        alert("Por favor selecciona una ruta primero");
                      }
                    }}
                    className={`p-4 border rounded-lg transition-all ${
                      activeSchedule 
                        ? isEditing
                          ? dragOverScheduleId === activeSchedule.id
                            ? "border-primary border-2 bg-primary/20 scale-105 shadow-lg"
                            : "border-primary border-2 bg-primary/10"
                          : dragOverScheduleId === activeSchedule.id
                            ? "border-primary/50 bg-primary/5"
                            : tripStatus === "trip-generated"
                              ? "border-success border-2 bg-success/10"
                              : tripStatus === "bus-no-trip"
                                ? "border-warning border-2 bg-warning/10"
                                : "border-primary/50 bg-primary/5"
                        : "border-border bg-muted/30"
                    } ${draggedBus && !canDrop ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {hour.toString().padStart(2, "0")}:00
                        </span>
                        {/* Show route selector if multiple schedules exist */}
                        {hourSchedules.length > 1 && (
                          <select
                            value={activeScheduleId || ""}
                            onChange={(e) => {
                              setSelectedScheduleForHour({
                                ...selectedScheduleForHour,
                                [hour]: e.target.value,
                              });
                              // Clear editing when switching schedules
                              setEditingScheduleId(null);
                              setEditingHour(null);
                            }}
                            className="px-2 py-1 bg-background border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {hourSchedules.map((s) => {
                              const route = routes.find(r => r.id === s.routeId);
                              return (
                                <option key={s.id} value={s.id}>
                                  {route ? `${route.origin} → ${route.destination}` : `Ruta ${s.routeId}`} {s.isExpress ? "(Expreso)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        )}
                        {/* Show route name if single schedule */}
                        {hourSchedules.length === 1 && activeSchedule && (
                          <span className="text-xs text-muted-foreground">
                            {getRouteNameForSchedule(activeSchedule.id)}
                          </span>
                        )}
                        {/* Trip status indicator */}
                        {activeSchedule && tripStatus === "trip-generated" && (
                          <span className="px-2 py-0.5 bg-success text-success-foreground rounded text-xs font-medium flex items-center gap-1">
                            <span>✓</span>
                            <span>Trip Generado</span>
                          </span>
                        )}
                        {activeSchedule && tripStatus === "bus-no-trip" && (
                          <span className="px-2 py-0.5 bg-warning text-warning-foreground rounded text-xs font-medium">
                            Bus sin Trip
                          </span>
                        )}
                        {activeSchedule ? (
                          <>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                activeSchedule.isExpress
                                  ? "bg-orange-500/20 text-orange-500"
                                  : "bg-blue-500/20 text-blue-500"
                              }`}
                            >
                              {activeSchedule.isExpress ? "Expreso" : "Normal"}
                            </span>
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingScheduleId(null);
                                  setEditingHour(null);
                                  setDragOverScheduleId(null);
                                } else {
                                  setEditingScheduleId(activeSchedule.id);
                                  setEditingHour(hour);
                                }
                              }}
                              className={`ml-2 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                isEditing
                                  ? "bg-green-500 text-white"
                                  : "bg-muted hover:bg-muted/80"
                              }`}
                              title={isEditing ? "Desactivar edición" : "Activar edición para asignar buses"}
                            >
                              {isEditing ? "✓ Editando" : "Editar"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingHour(null);
                                setEditingScheduleId(null);
                                setDragOverScheduleId(null);
                                // Clear selected route for this hour
                                const newRoutes = { ...selectedRouteForHour };
                                delete newRoutes[hour];
                                setSelectedRouteForHour(newRoutes);
                              } else {
                                setEditingHour(hour);
                                setEditingScheduleId(null); // Clear any existing schedule editing
                              }
                            }}
                            className={`ml-2 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isEditing
                                ? "bg-green-500 text-white"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                            title={isEditing ? "Desactivar edición" : "Activar edición para crear horario y asignar buses"}
                          >
                            {isEditing ? "✓ Editando" : "Crear Horario"}
                          </button>
                        )}
                      </div>
                    </div>
                    {isEditing && !activeSchedule && (
                      <div className="mb-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <label className="block text-sm font-medium mb-2">
                          Selecciona una ruta para este horario:
                        </label>
                        {routes.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No hay rutas disponibles. <Link href="/dashboard/routes/new" className="text-primary hover:underline">Crear ruta</Link>
                          </div>
                        ) : (
                          <>
                            <select
                              value={selectedRouteForHour[hour] || ""}
                              onChange={(e) => {
                                setSelectedRouteForHour({
                                  ...selectedRouteForHour,
                                  [hour]: e.target.value,
                                });
                              }}
                              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              <option value="">-- Selecciona una ruta --</option>
                              {routes.map((route) => (
                                <option key={route.id} value={route.id}>
                                  {route.origin} → {route.destination}
                                </option>
                              ))}
                            </select>
                            {!selectedRouteForHour[hour] && (
                              <p className="text-xs text-muted-foreground mt-2">
                                ⚠️ Selecciona una ruta para poder asignar buses
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {(activeSchedule || (isEditing && selectedRouteForHour[hour])) && (
                      <div className="space-y-2">
                        {scheduleAssignments.map((assignment) => {
                          const bus = getBusById(assignment.busId);
                          return (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-2 bg-background rounded border hover:bg-muted/50 transition-colors"
                            >
                              <span className="text-sm font-medium">
                                {bus?.plateNumber} {bus?.unitNumber && `(${bus.unitNumber})`}
                                {bus && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    - {bus.capacity} asientos
                                  </span>
                                )}
                              </span>
                              {isEditing && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleModifyAssignment(assignment)}
                                    className="text-primary hover:text-primary/80 text-sm font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                                    title="Cambiar bus"
                                  >
                                    Cambiar
                                  </button>
                                  <button
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                    className="text-destructive hover:text-destructive/80 text-sm font-bold px-2 py-1 rounded hover:bg-destructive/10 transition-colors"
                                    title="Eliminar asignación"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {scheduleAssignments.length === 0 && (
                          <div className={`text-xs p-2 text-center border-2 border-dashed rounded ${
                            isEditing 
                              ? "text-primary border-primary bg-primary/5" 
                              : "text-muted-foreground border-border"
                          }`}>
                            {isEditing 
                              ? routeSelected
                                ? activeSchedule
                                  ? "Modo edición activo - Arrastra un bus aquí"
                                  : "Modo edición activo - Arrastra un bus aquí para crear el horario"
                                : "Selecciona una ruta arriba para poder asignar buses"
                              : activeSchedule
                                ? "Haz clic en &apos;Editar&apos; para asignar buses"
                                : "Haz clic en &apos;Crear Horario&apos; para activar"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Available Buses */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Buses Disponibles</h2>
              {(editingScheduleId || editingHour !== null) && (
                <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-lg text-sm font-medium">
                  Modo Edición Activo
                </span>
              )}
            </div>
            {!editingScheduleId && !editingHour && (
              <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
                Selecciona un horario y haz clic en &quot;Editar&quot; o &quot;Crear Horario&quot; para activar el modo de asignación
              </div>
            )}
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {buses.map((bus) => {
                const isDraggable = editingScheduleId !== null || editingHour !== null;
                return (
                  <div
                    key={bus.id}
                    draggable={isDraggable}
                    onDragStart={(e) => {
                      if (isDraggable) {
                        handleDragStart(e, bus);
                      } else {
                        e.preventDefault();
                      }
                    }}
                    onDragEnd={handleDragEnd}
                    className={`p-4 border border-border rounded-lg bg-background transition-all ${
                      isDraggable
                        ? "cursor-move hover:bg-muted hover:border-primary active:scale-95"
                        : "cursor-not-allowed opacity-50"
                    }`}
                    title={isDraggable ? "Arrastra para asignar a un horario en edición" : "Activa el modo edición en un horario primero"}
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{bus.plateNumber}</p>
                      {bus.unitNumber && (
                        <p className="text-sm text-muted-foreground">
                          Unidad: {bus.unitNumber}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Capacidad: {bus.capacity} asientos
                      </p>
                      {bus.lastTripDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Último viaje: {new Date(bus.lastTripDate).toLocaleDateString('es-PA', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para modificar asignación */}
      {modifyingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Modificar Bus Asignado</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bus Actual
                </label>
                <p className="text-sm text-muted-foreground">
                  {getBusById(modifyingAssignment.busId)?.plateNumber}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nuevo Bus *
                </label>
                <select
                  value={selectedNewBusId}
                  onChange={(e) => setSelectedNewBusId(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecciona un bus</option>
                  {buses
                    .filter(b => b.id !== modifyingAssignment.busId)
                    .map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.plateNumber} {bus.unitNumber && `(${bus.unitNumber})`} - {bus.capacity} asientos
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Razón del Cambio *
                </label>
                <textarea
                  value={modifyReason}
                  onChange={(e) => setModifyReason(e.target.value)}
                  placeholder="Ej: Bus en mantenimiento, cambio de ruta, etc."
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta razón quedará registrada en el historial del bus
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setModifyingAssignment(null);
                    setModifyReason("");
                    setSelectedNewBusId("");
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveModification}
                  disabled={!selectedNewBusId || !modifyReason.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Cambio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

