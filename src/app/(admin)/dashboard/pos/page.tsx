"use client";

import { useState, useEffect } from "react";
import { TouchSeatSelector } from "@/components/pos/TouchSeatSelector";
import { TouchButton } from "@/components/pos/TouchButton";
import { PaymentAmountInput } from "@/components/pos/PaymentAmountInput";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";
import { WeeklyScheduleCalendar } from "@/components/pos/WeeklyScheduleCalendar";
import { SeatSelectionModal } from "@/components/pos/SeatSelectionModal";
import { useTripSync } from "@/hooks/useTripSync";
import { format } from "date-fns";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface RouteStop {
  id: string;
  name: string;
  price: number;
  orderIndex: number;
}

interface Schedule {
  id: string;
  hour: number;
  hourFormatted: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  isExpress: boolean;
  price: number;
  basePrice: number;
  minPrice?: number;
  maxPrice?: number;
  stops?: RouteStop[];
  assignedBuses: Array<{
    id: string;
    plateNumber: string;
    unitNumber: string | null;
    capacity: number;
  }>;
  availableSeats: number;
  totalSeats: number;
  hasTrips: boolean;
  tripIds: string[];
  hasAssignedBuses?: boolean;
  date?: string;
}


interface Trip {
  id: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  route: {
    origin: string;
    destination: string;
  };
  bus: {
    id?: string;
    seatMap: {
      seats: Array<{
        id: string;
        number: string;
        x: number;
        y: number;
        type: string;
        row: number;
        column: number;
      }>;
    };
  };
  availableSeats: number;
  totalSeats: number;
}

interface Seat {
  id: string;
  number: string;
  x: number;
  y: number;
  type: "single" | "double" | "aisle";
  row: number;
  column: number;
  isAvailable: boolean;
}

interface Passenger {
  id: string; // Unique ID for this passenger form
  seatId: string;
  name: string;
  phone?: string;
  documentId: string;
  documentType: "cedula" | "pasaporte";
}

export default function POSPage() {
  const terminalId = undefined;
  const sessionId = undefined;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [secondaryDisplayWindow, setSecondaryDisplayWindow] = useState<Window | null>(null);
  
  // Week selection - minimum 7 days from today
  const getMinWeekStart = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    // Get Sunday of that week
    const day = minDate.getDay();
    const diff = minDate.getDate() - day;
    const sunday = new Date(minDate.setDate(diff));
    return format(sunday, "yyyy-MM-dd");
  };
  
  const [weekStart, setWeekStart] = useState<string>(getMinWeekStart());

  useEffect(() => {
    // Fetch schedules for all days in the week
    fetchSchedulesForWeek();
  }, [weekStart]);

  // Subscribe to realtime changes using the sync hook
  useTripSync({
    onTripCreated: () => {
      console.log('Trip created - refreshing schedules');
      fetchSchedulesForWeek();
    },
    onTripUpdated: () => {
      console.log('Trip updated - refreshing schedules');
      fetchSchedulesForWeek();
      // If current trip was updated, refresh it
      if (selectedTrip) {
        fetchTripDetails(selectedTrip.id);
      }
    },
    onTripDeleted: () => {
      console.log('Trip deleted - refreshing schedules');
      fetchSchedulesForWeek();
    },
    onTicketCreated: () => {
      console.log('Ticket created - refreshing availability');
      // Refresh current trip if selected
      if (selectedTrip) {
        fetchTripDetails(selectedTrip.id);
      }
    },
    onTicketUpdated: () => {
      console.log('Ticket updated - refreshing availability');
      if (selectedTrip) {
        fetchTripDetails(selectedTrip.id);
      }
    },
    enabled: true,
  });

  useEffect(() => {
    if (selectedSchedule) {
      if (selectedSchedule.tripIds.length > 0) {
        // Trip already exists, fetch it
        fetchTripDetails(selectedSchedule.tripIds[0]);
      } else if (selectedSchedule.hasAssignedBuses) {
        // No trip exists but has bus assigned - fetch bus details to show seat map
        fetchBusForSchedule(selectedSchedule);
      } else {
        setSelectedTrip(null);
        setSelectedSeats([]);
        setPassengers([]);
      }
      // Update secondary display when schedule changes
      updateSecondaryDisplay(selectedSchedule);
    } else {
      setSelectedTrip(null);
      setSelectedSeats([]);
      setPassengers([]);
      updateSecondaryDisplay(null);
    }
  }, [selectedSchedule]);

  // Update secondary display when trip is loaded and open seat selection modal
  useEffect(() => {
    if (selectedTrip && selectedSchedule) {
      // Automatically open seat selection modal for the operator
      setShowSeatSelection(true);
    }
  }, [selectedTrip]);

  // Update secondary display when seat selection modal opens/closes or seats are selected
  useEffect(() => {
    if (showSeatSelection && selectedTrip && selectedSchedule) {
      // Show seat selection on secondary display when modal is open
      const state = {
        mode: "seat-selection" as const,
        tripId: selectedTrip.id,
        busId: selectedTrip.bus?.id || "",
        availableSeats: selectedTrip.availableSeats || 0,
        totalSeats: selectedTrip.totalSeats || 0,
        selectedSeatIds: selectedSeats, // Include all selected seat IDs
      };
      localStorage.setItem("pos-secondary-display", JSON.stringify(state));
      const channel = new BroadcastChannel("pos-secondary-display");
      channel.postMessage(state);
      channel.close();
    } else {
      // Show advertising when modal is closed
      const state = { mode: "advertising" as const };
      localStorage.setItem("pos-secondary-display", JSON.stringify(state));
      const channel = new BroadcastChannel("pos-secondary-display");
      channel.postMessage(state);
      channel.close();
    }
  }, [showSeatSelection, selectedTrip, selectedSchedule, selectedSeats]);

  const fetchBusForSchedule = async (schedule: Schedule) => {
    setLoadingTrip(true);
    try {
      // Fetch bus details from the first assigned bus
      const firstBus = schedule.assignedBuses[0];
      if (!firstBus) return;
      
      const response = await fetch(`/api/admin/buses/${firstBus.id}`);
      const data = await response.json();
      
      if (response.ok && data.bus) {
        const bus = data.bus;
        const scheduleDate = schedule.date || format(new Date(), "yyyy-MM-dd");
        // Create a placeholder trip object with bus seat map
        setSelectedTrip({
          id: `pending-${schedule.id}`, // Temporary ID
          departureTime: `${scheduleDate}T${schedule.hour.toString().padStart(2, "0")}:00:00`,
          arrivalTime: `${scheduleDate}T${schedule.hour.toString().padStart(2, "0")}:00:00`,
          price: schedule.price,
          route: {
            origin: schedule.origin,
            destination: schedule.destination,
          },
          bus: {
            id: firstBus.id,
            seatMap: bus.seatMap || { seats: [] },
          },
          availableSeats: schedule.availableSeats || bus.capacity || 0,
          totalSeats: schedule.totalSeats || bus.capacity || 0,
        } as Trip);
      }
    } catch (error) {
      console.error("Error fetching bus details:", error);
    } finally {
      setLoadingTrip(false);
    }
  };

  const fetchSchedulesForWeek = async () => {
    setLoadingSchedules(true);
    try {
      // Fetch schedules for all 7 days of the week
      const weekStartDate = new Date(weekStart);
      const allSchedules: Schedule[] = [];

      console.log(`[POS Page] Fetching schedules for week starting ${weekStart}`);

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + i);
        const dateStr = format(date, "yyyy-MM-dd");

        try {
          console.log(`[POS Page] Fetching schedules for date ${dateStr}`);
          const response = await fetch(`/api/pos/schedules?date=${dateStr}`);
          const data = await response.json();
          if (response.ok && data.schedules) {
            console.log(`[POS Page] Received ${data.schedules.length} schedules for ${dateStr}`);
            // Ensure each schedule has the date
            const schedulesWithDate = data.schedules.map((s: Schedule) => ({
              ...s,
              date: dateStr,
            }));
            allSchedules.push(...schedulesWithDate);
          } else {
            console.error(`[POS Page] Error response for ${dateStr}:`, data);
          }
        } catch (error) {
          console.error(`[POS Page] Error fetching schedules for ${dateStr}:`, error);
        }
      }

      console.log(`[POS Page] Total schedules fetched: ${allSchedules.length}`);
      setSchedules(allSchedules);
    } catch (error) {
      console.error("[POS Page] Error fetching schedules:", error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchTripDetails = async (tripId: string) => {
    setLoadingTrip(true);
    try {
      const response = await fetch(`/api/public/trips/${tripId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedTrip(data.trip);
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
    } finally {
      setLoadingTrip(false);
    }
  };

  const createDisplaySession = async () => {
    if (!selectedTrip || selectedSeats.length === 0) return;

    try {
      const response = await fetch("/api/pos/display/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seatIds: selectedSeats,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setDisplaySessionId(data.sessionId);
        window.open(`/displays/pos-client/${data.sessionId}`, "_blank");
      }
    } catch (error) {
      console.error("Error creating display session:", error);
    }
  };

  const processSale = async () => {
    // Validate that we have at least one passenger with complete information
    if (!selectedTrip || selectedSeats.length === 0 || passengers.length === 0 || !selectedSchedule) {
      alert("Por favor selecciona al menos un asiento y completa la información del pasajero");
      return;
    }

    // Validate all passengers have required fields
    const incompletePassengers = passengers.filter(
      (p) => !p.name || !p.documentId
    );
    if (incompletePassengers.length > 0) {
      alert("Por favor completa todos los campos requeridos (nombre y documento) para todos los pasajeros");
      return;
    }

    // Validate that each passenger has a seat
    if (passengers.length !== selectedSeats.length) {
      alert("Cada pasajero debe tener un asiento asignado");
      return;
    }

    if (!sessionId) {
      alert("No hay sesión de caja activa. Por favor abre la caja primero.");
      return;
    }

    // Calculate total amount (price per ticket * number of tickets)
    const totalAmount = selectedTrip.price * passengers.length;
    const totalWithITBMS = totalAmount * 1.07;

    if (paymentMethod === "cash" && (!receivedAmount || receivedAmount < totalWithITBMS)) {
      alert(`El monto recibido debe ser mayor o igual al total de ${totalWithITBMS.toFixed(2)} (con ITBMS)`);
      return;
    }

    setIsProcessing(true);
    try {
      let tripId = selectedTrip.id;
      
      // If trip doesn't exist yet (pending trip), create it first
      if (tripId.startsWith("pending-") && selectedSchedule?.date) {
        try {
          const createTripResponse = await fetch("/api/admin/schedules/generate-trips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: selectedSchedule.date }),
          });
          
          if (createTripResponse.ok) {
            const tripData = await createTripResponse.json();
            // Find the trip for this schedule
            const createdTrips = tripData.trips || [];
            const matchingTrip = createdTrips.find((t: any) => {
              const depTime = new Date(t.departureTime);
              return depTime.getHours() === selectedSchedule.hour && 
                     t.routeId === selectedSchedule.routeId;
            });
            
            if (matchingTrip) {
              tripId = matchingTrip.id;
              // Fetch full trip details
              const tripDetailsResponse = await fetch(`/api/public/trips/${tripId}`);
              if (tripDetailsResponse.ok) {
                const tripDetails = await tripDetailsResponse.json();
                setSelectedTrip(tripDetails.trip);
              }
            } else {
              throw new Error("No se pudo crear el viaje para este horario");
            }
          } else {
            throw new Error("Error al crear el viaje");
          }
        } catch (error) {
          console.error("Error creating trip:", error);
          alert("Error al crear el viaje. Por favor intenta nuevamente.");
          setIsProcessing(false);
          return;
        }
      }
      
      // Prepare tickets data
      const ticketsData = passengers.map((passenger) => ({
        tripId: tripId,
        seatId: passenger.seatId,
        passengerName: passenger.name,
        passengerPhone: passenger.phone || undefined,
        passengerDocumentId: passenger.documentId,
        passengerDocumentType: passenger.documentType,
        destinationStopId: null, // TODO: Get from route stops
      }));

      const response = await fetch("/api/pos/tickets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickets: ticketsData,
          paymentMethod,
          amount: totalAmount,
          terminalId: terminalId || "pos-1",
          sessionId,
          receivedAmount: paymentMethod === "cash" ? receivedAmount : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Print thermal tickets (if Electron is available)
        try {
          if (typeof window !== "undefined" && (window as any).electron) {
            for (const ticket of data.tickets) {
              const seatNumber = getSeats().find((s) => s.id === ticket.seatId)?.number || "N/A";
              const passenger = passengers.find((p) => p.seatId === ticket.seatId);
              await (window as any).electron.printTicket({
                ticketId: ticket.id,
                qrCode: ticket.qrCode,
                passengerName: passenger?.name || "",
                seatNumber: seatNumber,
                origin: selectedTrip.route.origin,
                destination: selectedTrip.route.destination,
                departureTime: format(new Date(selectedTrip.departureTime), "dd/MM/yyyy HH:mm"),
                price: selectedTrip.price,
                itbms: selectedTrip.price * 0.07,
                total: selectedTrip.price * 1.07,
                ticketNumber: ticket.id.substring(0, 8).toUpperCase(),
              });
            }
          }
        } catch (printError) {
          console.error("Error printing tickets:", printError);
        }

        // Print fiscal invoice (if Electron is available)
        try {
          if (typeof window !== "undefined" && (window as any).electron) {
            await (window as any).electron.sendToFiscal({
              ticketId: data.transaction.id,
              items: passengers.map((passenger) => ({
                description: `Boleto ${selectedTrip.route.origin} → ${selectedTrip.route.destination} - Asiento ${getSeats().find((s) => s.id === passenger.seatId)?.number || "N/A"}`,
                quantity: 1,
                unitPrice: selectedTrip.price,
                total: selectedTrip.price,
              })),
              subtotal: totalAmount,
              itbms: totalAmount * 0.07,
              total: totalWithITBMS,
              paymentMethod: paymentMethod,
              passengerName: passengers[0]?.name || "",
              passengerDocumentId: passengers[0]?.documentId || "",
              terminalId: terminalId || "pos-1",
            });
          }
        } catch (fiscalError) {
          console.error("Error printing fiscal invoice:", fiscalError);
        }

        alert(`✓ Venta procesada exitosamente - ${passengers.length} boleto(s) vendido(s)`);
        // Reset form
        setSelectedSchedule(null);
        setSelectedTrip(null);
        setSelectedSeats([]);
        setPassengers([]);
        setShowSeatSelection(false); // Close seat selection modal
        setPaymentMethod("cash");
        setReceivedAmount(null);
        setDisplaySessionId(null);
        updateSecondaryDisplay(null); // Reset to advertising
        fetchSchedulesForWeek();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Error al procesar la venta"}`);
      }
    } catch (error) {
      console.error("Error processing sale:", error);
      alert("Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeats = (): Seat[] => {
    if (!selectedTrip?.bus?.seatMap?.seats) return [];

    // Get booked seats for this trip
    // TODO: Fetch from API
    const bookedSeats: string[] = [];

    return selectedTrip.bus.seatMap.seats.map((seat) => ({
      id: seat.id,
      number: seat.number,
      x: seat.x,
      y: seat.y,
      type: (seat.type as "single" | "double" | "aisle") || "single",
      row: seat.row,
      column: seat.column,
      isAvailable: !bookedSeats.includes(seat.id),
    }));
  };

  const handleScheduleSelect = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    // Open or update secondary display window
    updateSecondaryDisplay(schedule);
  };

  const updateSecondaryDisplay = (schedule?: Schedule | null) => {
    // Open secondary display window if not already open
    if (!secondaryDisplayWindow || secondaryDisplayWindow.closed) {
      const newWindow = window.open(
        "/dashboard/pos/secondary-display",
        "pos-secondary-display",
        "width=1920,height=1080,left=1920,top=0"
      );
      if (newWindow) {
        setSecondaryDisplayWindow(newWindow);
        // Wait for window to load before sending message
        newWindow.addEventListener("load", () => {
          sendSecondaryDisplayUpdate(schedule);
        });
      }
    } else {
      sendSecondaryDisplayUpdate(schedule);
    }
  };

  const sendSecondaryDisplayUpdate = (schedule?: Schedule | null) => {
    // Always show advertising on secondary display
    // Seat selection is handled in the main POS screen for the operator
    const state = { mode: "advertising" as const };
    localStorage.setItem("pos-secondary-display", JSON.stringify(state));
    const channel = new BroadcastChannel("pos-secondary-display");
    channel.postMessage(state);
    channel.close();
  };


  const handleSeatSelect = (seatId: string) => {
    // Toggle seat selection - add if not selected, remove if already selected
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        // Remove seat and its associated passenger
        const newSeats = prev.filter((id) => id !== seatId);
        setPassengers((prevPassengers) => prevPassengers.filter((p) => p.seatId !== seatId));
        return newSeats;
      } else {
        // Add seat and create passenger form
        const newPassenger: Passenger = {
          id: `passenger-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          seatId,
          name: "",
          documentId: "",
          documentType: "cedula",
        };
        setPassengers((prev) => [...prev, newPassenger]);
        return [...prev, seatId];
      }
    });
  };

  const clearSelection = () => {
    setSelectedSchedule(null);
    setSelectedTrip(null);
    setSelectedSeats([]);
    setPassengers([]);
    setShowSeatSelection(false);
    updateSecondaryDisplay(null);
  };

  const handleOpenSeatSelection = () => {
    if (selectedTrip && selectedSchedule) {
      setShowSeatSelection(true);
    }
  };

  const handleSeatSelectFromModal = (seatId: string) => {
    handleSeatSelect(seatId);
    // Don't close modal immediately - let user select more seats or confirm
  };

  const addPassenger = () => {
    // This will be called when user wants to add another passenger
    // The seat selection will happen in the modal
    if (selectedTrip && selectedSchedule) {
      setShowSeatSelection(true);
    }
  };

  const removePassenger = (passengerId: string) => {
    const passenger = passengers.find((p) => p.id === passengerId);
    if (passenger) {
      setSelectedSeats((prev) => prev.filter((id) => id !== passenger.seatId));
      setPassengers((prev) => prev.filter((p) => p.id !== passengerId));
    }
  };

  const updatePassenger = (passengerId: string, updates: Partial<Passenger>) => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === passengerId ? { ...p, ...updates } : p))
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-primary hover:text-primary-dark mb-2 inline-block text-lg"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-4xl font-bold">Terminal POS</h1>
            <p className="text-muted-foreground text-lg mt-1">Terminal: POS-001</p>
          </div>
        </div>

        {/* Main Content - Single Page Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Selection Grids */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weekly Schedule Calendar */}
            <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Calendario de Horarios</h2>
              <WeeklyScheduleCalendar
                schedules={schedules}
                selectedScheduleId={selectedSchedule?.id || null}
                onSelectSchedule={handleScheduleSelect}
                loading={loadingSchedules}
                initialDate={weekStart}
              />
            </div>

            {/* Schedule Details and Seat Selection Button */}
            {selectedSchedule && (selectedSchedule.hasTrips || selectedSchedule.hasAssignedBuses) && (
              <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedSchedule.routeName}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedSchedule.origin} → {selectedSchedule.destination}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSchedule.hourFormatted} - {selectedSchedule.isExpress ? "Expreso" : "Normal"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Cupo Disponible</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedSchedule.availableSeats} / {selectedSchedule.totalSeats}
                    </p>
                  </div>
                </div>
                {selectedTrip && (
                  <TouchButton
                    onClick={handleOpenSeatSelection}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    Seleccionar Asiento
                  </TouchButton>
                )}
              </div>
            )}

          </div>

          {/* Right Column - Passenger Info and Sale */}
          <div className="lg:col-span-1">
            <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 shadow-lg sticky top-4">
              <h2 className="text-2xl font-bold mb-6">Información de Venta</h2>

              {selectedTrip && (
                <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Viaje</p>
                    <p className="font-bold text-xl">
                      {selectedTrip.route.origin} → {selectedTrip.route.destination}
                    </p>
                  </div>

                  {selectedSeats.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Asientos Seleccionados</p>
                      <p className="font-bold text-2xl text-primary">
                        {selectedSeats.map((seatId) => getSeats().find((s) => s.id === seatId)?.number || seatId).join(", ")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedSeats.length} {selectedSeats.length === 1 ? "asiento" : "asientos"}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Precio por Boleto</p>
                    <p className="font-bold text-xl text-primary">
                      ${selectedTrip.price.toFixed(2)}
                    </p>
                    {selectedSeats.length > 0 && (
                      <>
                        <p className="text-sm text-muted-foreground mb-1 mt-2">Total ({selectedSeats.length} {selectedSeats.length === 1 ? "boleto" : "boletos"})</p>
                        <p className="font-bold text-3xl text-primary">
                          ${(selectedTrip.price * selectedSeats.length).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ITBMS (7%): ${(selectedTrip.price * selectedSeats.length * 0.07).toFixed(2)}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          Total con ITBMS: ${(selectedTrip.price * selectedSeats.length * 1.07).toFixed(2)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selectedSeats.length > 0 && selectedTrip && (
                <div className="space-y-6 border-t-2 border-border pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Información de Pasajeros</h3>
                    <TouchButton
                      onClick={addPassenger}
                      variant="secondary"
                      size="sm"
                      disabled={!selectedTrip || !selectedSchedule}
                    >
                      + Agregar Pasajero
                    </TouchButton>
                  </div>

                  {passengers.map((passenger, index) => {
                    const seatNumber = getSeats().find((s) => s.id === passenger.seatId)?.number || passenger.seatId;
                    return (
                      <div key={passenger.id} className="border-2 border-border rounded-xl p-6 bg-muted/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold">
                            Pasajero {index + 1} - Asiento {seatNumber}
                          </h4>
                          {passengers.length > 1 && (
                            <TouchButton
                              onClick={() => removePassenger(passenger.id)}
                              variant="danger"
                              size="sm"
                            >
                              Eliminar
                            </TouchButton>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              Nombre del Pasajero *
                            </label>
                            <input
                              type="text"
                              value={passenger.name}
                              onChange={(e) => updatePassenger(passenger.id, { name: e.target.value })}
                              className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[56px]"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              Teléfono (Opcional)
                            </label>
                            <input
                              type="tel"
                              value={passenger.phone || ""}
                              onChange={(e) => updatePassenger(passenger.id, { phone: e.target.value })}
                              className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[56px]"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              Tipo de Documento *
                            </label>
                            <select
                              value={passenger.documentType}
                              onChange={(e) => updatePassenger(passenger.id, { documentType: e.target.value as "cedula" | "pasaporte" })}
                              className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[56px]"
                              required
                            >
                              <option value="cedula">Cédula</option>
                              <option value="pasaporte">Pasaporte</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-2">
                              {passenger.documentType === "cedula" ? "Cédula" : "Pasaporte"} *
                            </label>
                            <input
                              type="text"
                              value={passenger.documentId}
                              onChange={(e) => updatePassenger(passenger.id, { documentId: e.target.value })}
                              placeholder={passenger.documentType === "cedula" ? "8-1234-5678" : "A123456"}
                              className="w-full px-4 py-3 bg-background border-2 border-input rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[56px]"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Payment Method Selection */}
                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Método de Pago *
                    </label>
                    <div className="flex gap-4">
                      <TouchButton
                        onClick={() => {
                          setPaymentMethod("cash");
                          setReceivedAmount(null);
                        }}
                        variant={paymentMethod === "cash" ? "primary" : "secondary"}
                        size="lg"
                        className="flex-1"
                      >
                        Efectivo
                      </TouchButton>
                      <TouchButton
                        onClick={() => {
                          setPaymentMethod("card");
                          setReceivedAmount(null);
                        }}
                        variant={paymentMethod === "card" ? "primary" : "secondary"}
                        size="lg"
                        className="flex-1"
                      >
                        Tarjeta
                      </TouchButton>
                    </div>
                  </div>

                  {/* Payment Amount Input */}
                  {selectedTrip && selectedSeats.length > 0 && (
                    <PaymentAmountInput
                      totalAmount={selectedTrip.price * selectedSeats.length * 1.07} // Total price + 7% ITBMS
                      onAmountReceived={(amount, change) => {
                        setReceivedAmount(amount);
                      }}
                      paymentMethod={paymentMethod}
                      disabled={isProcessing}
                    />
                  )}

                  <TouchButton
                    onClick={processSale}
                    disabled={
                      isProcessing ||
                      passengers.length === 0 ||
                      passengers.some((p) => !p.name || !p.documentId) ||
                      (paymentMethod === "cash" && (!receivedAmount || receivedAmount < (selectedTrip.price * selectedSeats.length * 1.07)))
                    }
                    variant="success"
                    size="lg"
                    className="w-full"
                  >
                    {isProcessing ? "Procesando..." : `Procesar Venta (${passengers.length} ${passengers.length === 1 ? "boleto" : "boletos"})`}
                  </TouchButton>
                </div>
              )}

              {selectedSeats.length === 0 && selectedTrip && (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  Selecciona al menos un asiento para continuar
                </div>
              )}

              {!selectedTrip && (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  Selecciona un horario o ruta para comenzar
                </div>
              )}

              {displaySessionId && (
                <div className="mt-6 p-4 bg-muted rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Sesión de Pantalla</p>
                  <p className="font-mono text-xs break-all">{displaySessionId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seat Selection Modal */}
      {showSeatSelection && selectedTrip && selectedSchedule && (
        <SeatSelectionModal
          tripId={selectedTrip.id}
          busId={selectedTrip.bus?.id || ""}
          availableSeats={selectedTrip.availableSeats || 0}
          totalSeats={selectedTrip.totalSeats || 0}
          onSelect={handleSeatSelectFromModal}
          onClose={() => {
            setShowSeatSelection(false);
          }}
          selectedSeatIds={selectedSeats}
          allowMultiple={true}
        />
      )}

    </div>
  );
}
