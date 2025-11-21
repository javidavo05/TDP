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

interface POSPageProps {
  terminalId?: string;
  sessionId?: string;
}

export default function POSPage(props: POSPageProps = {}) {
  const { terminalId, sessionId } = props;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [displaySessionId, setDisplaySessionId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerDocumentId, setPassengerDocumentId] = useState("");
  const [passengerDocumentType, setPassengerDocumentType] = useState<"cedula" | "pasaporte">("cedula");
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
        setSelectedSeat(null);
      }
      // Update secondary display when schedule changes
      updateSecondaryDisplay(selectedSchedule);
    } else {
      setSelectedTrip(null);
      setSelectedSeat(null);
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

  // Update secondary display when seat selection modal opens/closes or seat is selected
  useEffect(() => {
    if (showSeatSelection && selectedTrip && selectedSchedule) {
      // Show seat selection on secondary display when modal is open
      const state = {
        mode: "seat-selection" as const,
        tripId: selectedTrip.id,
        busId: selectedTrip.bus?.id || "",
        availableSeats: selectedTrip.availableSeats || 0,
        totalSeats: selectedTrip.totalSeats || 0,
        selectedSeatId: selectedSeat || null, // Include selected seat ID
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
  }, [showSeatSelection, selectedTrip, selectedSchedule, selectedSeat]);

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
    if (!selectedTrip || !selectedSeat) return;

    try {
      const response = await fetch("/api/pos/display/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seatId: selectedSeat,
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
    if (!selectedTrip || !selectedSeat || !passengerName || !passengerDocumentId || !selectedSchedule) {
      alert("Por favor completa todos los campos requeridos (nombre y documento)");
      return;
    }

    if (!sessionId) {
      alert("No hay sesión de caja activa. Por favor abre la caja primero.");
      return;
    }

    if (paymentMethod === "cash" && (!receivedAmount || receivedAmount < selectedTrip.price * 1.07)) {
      alert("El monto recibido debe ser mayor o igual al precio del boleto (con ITBMS)");
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
      
      const totalAmount = selectedTrip.price;
      const response = await fetch("/api/pos/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: tripId,
          seatId: selectedSeat,
          passengerName,
          passengerPhone,
          passengerDocumentId,
          passengerDocumentType,
          destinationStopId: null, // TODO: Get from route stops
          paymentMethod,
          amount: totalAmount,
          terminalId: terminalId || "pos-1",
          sessionId,
          receivedAmount: paymentMethod === "cash" ? receivedAmount : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Print thermal ticket (if Electron is available)
        try {
          if (typeof window !== "undefined" && (window as any).electron) {
            const selectedSeatNumber = getSeats().find((s) => s.id === selectedSeat)?.number || "N/A";
            await (window as any).electron.printTicket({
              ticketId: data.ticket.id,
              qrCode: data.ticket.qrCode,
              passengerName: passengerName,
              seatNumber: selectedSeatNumber,
              origin: selectedTrip.route.origin,
              destination: selectedTrip.route.destination,
              departureTime: format(new Date(selectedTrip.departureTime), "dd/MM/yyyy HH:mm"),
              price: selectedTrip.price,
              itbms: selectedTrip.price * 0.07,
              total: selectedTrip.price * 1.07,
              ticketNumber: data.ticket.id.substring(0, 8).toUpperCase(),
            });
          }
        } catch (printError) {
          console.error("Error printing ticket:", printError);
        }

        // Print fiscal invoice (if Electron is available)
        try {
          if (typeof window !== "undefined" && (window as any).electron) {
            await (window as any).electron.sendToFiscal({
              ticketId: data.ticket.id,
              items: [{
                description: `Boleto ${selectedTrip.route.origin} → ${selectedTrip.route.destination}`,
                quantity: 1,
                unitPrice: selectedTrip.price,
                total: selectedTrip.price,
              }],
              subtotal: selectedTrip.price,
              itbms: selectedTrip.price * 0.07,
              total: selectedTrip.price * 1.07,
              paymentMethod: "cash",
              passengerName: passengerName,
              passengerDocumentId: passengerDocumentId,
              terminalId: "pos-1",
            });
          }
        } catch (fiscalError) {
          console.error("Error printing fiscal invoice:", fiscalError);
        }

        alert("✓ Venta procesada exitosamente");
        // Reset form
        setSelectedSchedule(null);
        setSelectedTrip(null);
        setSelectedSeat(null);
        setShowSeatSelection(false); // Close seat selection modal
        setPassengerName("");
        setPassengerPhone("");
        setPassengerDocumentId("");
        setPassengerDocumentType("cedula");
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
    setSelectedSeat(seatId);
  };

  const clearSelection = () => {
    setSelectedSchedule(null);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setShowSeatSelection(false);
    updateSecondaryDisplay(null);
  };

  const handleOpenSeatSelection = () => {
    if (selectedTrip && selectedSchedule) {
      setShowSeatSelection(true);
    }
  };

  const handleSeatSelectFromModal = (seatId: string) => {
    setSelectedSeat(seatId);
    // Don't close modal immediately - let user confirm
    // Modal will close when user clicks confirm button
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

                  {selectedSeat && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Asiento</p>
                      <p className="font-bold text-3xl text-primary">
                        {getSeats().find((s) => s.id === selectedSeat)?.number || selectedSeat}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Precio</p>
                    <p className="font-bold text-3xl text-primary">
                      ${selectedTrip.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {selectedSeat && selectedTrip && (
                <div className="space-y-6 border-t-2 border-border pt-6">
                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Nombre del Pasajero *
                    </label>
                    <input
                      type="text"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Teléfono (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      Tipo de Documento *
                    </label>
                    <select
                      value={passengerDocumentType}
                      onChange={(e) => setPassengerDocumentType(e.target.value as "cedula" | "pasaporte")}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                      required
                    >
                      <option value="cedula">Cédula</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold mb-3">
                      {passengerDocumentType === "cedula" ? "Cédula" : "Pasaporte"} *
                    </label>
                    <input
                      type="text"
                      value={passengerDocumentId}
                      onChange={(e) => setPassengerDocumentId(e.target.value)}
                      placeholder={passengerDocumentType === "cedula" ? "8-1234-5678" : "A123456"}
                      className="w-full px-6 py-5 bg-background border-2 border-input rounded-xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                      required
                    />
                  </div>

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
                  {selectedTrip && (
                    <PaymentAmountInput
                      totalAmount={selectedTrip.price * 1.07} // Price + 7% ITBMS
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
                      !passengerName ||
                      !passengerDocumentId ||
                      (paymentMethod === "cash" && (!receivedAmount || receivedAmount < (selectedTrip.price * 1.07)))
                    }
                    variant="success"
                    size="lg"
                    className="w-full"
                  >
                    {isProcessing ? "Procesando..." : "Procesar Venta"}
                  </TouchButton>
                </div>
              )}

              {!selectedSeat && selectedTrip && (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  Selecciona un asiento para continuar
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
        />
      )}

    </div>
  );
}
