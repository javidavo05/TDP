"use client";

import { useState, useEffect } from "react";
import { QRScanner } from "@/components/QRScanner";
import { format } from "date-fns";
import { triggerSuccessFeedback, triggerErrorFeedback } from "@/lib/utils/feedback";
import { FeedbackAnimation } from "@/components/admin/FeedbackAnimation";

interface Ticket {
  id: string;
  qrCode: string;
  passengerName: string;
  status: string;
  trip: {
    id: string;
    departureTime: string;
    route: {
      origin: string;
      destination: string;
    };
  };
  seat: {
    number: string;
  };
}

interface ManifestEntry {
  ticket: Ticket;
  validated: boolean;
  validatedAt?: Date;
}

export default function AssistantMobilePage() {
  const [scanned, setScanned] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    // TODO: Fetch current trip manifest
    fetchManifest();
  }, []);

  const fetchManifest = async () => {
    // TODO: Fetch from API
    setManifest([]);
  };

  const handleScanSuccess = async (qrCode: string) => {
    try {
      const response = await fetch(`/api/public/tickets?qr=${encodeURIComponent(qrCode)}`);
      const data = await response.json();
      if (response.ok && data.ticket) {
        const scannedTicket = data.ticket;
        
        // Check if ticket is already used or cancelled
        if (scannedTicket.status === "boarded") {
          triggerErrorFeedback();
          setFeedbackState("error");
          alert("Este ticket ya fue validado y usado");
          setTimeout(() => setFeedbackState(null), 1000);
          return;
        }
        
        if (scannedTicket.status === "cancelled") {
          triggerErrorFeedback();
          setFeedbackState("error");
          alert("Este ticket ha sido cancelado");
          setTimeout(() => setFeedbackState(null), 1000);
          return;
        }
        
        // Ticket is valid
        setTicket(scannedTicket);
        setScanned(true);
      } else {
        triggerErrorFeedback();
        setFeedbackState("error");
        alert("Ticket no encontrado");
        setTimeout(() => setFeedbackState(null), 1000);
      }
    } catch (error) {
      console.error("Error validating ticket:", error);
      triggerErrorFeedback();
      setFeedbackState("error");
      alert("Error al buscar el ticket");
      setTimeout(() => setFeedbackState(null), 1000);
    }
  };

  const handleValidate = async () => {
    if (!ticket) return;

    setIsValidating(true);
    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}/validate`, {
        method: "POST",
      });

      if (response.ok) {
        // Success feedback
        triggerSuccessFeedback();
        setFeedbackState("success");
        
        // Add to manifest
        setManifest((prev) => [
          ...prev,
          {
            ticket,
            validated: true,
            validatedAt: new Date(),
          },
        ]);
        
        // Reset after feedback
        setTimeout(() => {
          setScanned(false);
          setTicket(null);
          setFeedbackState(null);
        }, 1000);
      } else {
        const error = await response.json();
        triggerErrorFeedback();
        setFeedbackState("error");
        alert(`Error: ${error.error || "Error al validar el ticket"}`);
        setTimeout(() => setFeedbackState(null), 1000);
      }
    } catch (error) {
      console.error("Error validating ticket:", error);
      triggerErrorFeedback();
      setFeedbackState("error");
      alert("Error al validar el ticket");
      setTimeout(() => setFeedbackState(null), 1000);
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setTicket(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Feedback Animation */}
      {feedbackState && (
        <FeedbackAnimation
          type={feedbackState}
          onComplete={() => setFeedbackState(null)}
        />
      )}
      
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Assistant - Validación de Tickets</h1>
          <p className="text-muted-foreground">Escanea códigos QR para validar pasajeros</p>
        </div>

        {/* Scanner Section */}
        {!scanned ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Escanear Código QR</h2>
            <div className="bg-muted rounded-lg overflow-hidden">
              <QRScanner onScanSuccess={handleScanSuccess} />
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-6 animate-scaleIn">
            <h2 className="text-xl font-semibold mb-4">Ticket Encontrado</h2>
            {ticket && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pasajero</p>
                    <p className="font-semibold text-lg">{ticket.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Asiento</p>
                    <p className="font-semibold text-lg">{ticket.seat?.number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Estado</p>
                    <p className={`font-semibold capitalize ${
                      ticket.status === "paid" ? "text-success" :
                      ticket.status === "boarded" ? "text-warning" :
                      "text-muted-foreground"
                    }`}>
                      {ticket.status === "paid" ? "Pagado" :
                       ticket.status === "boarded" ? "Abordado" :
                       ticket.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Viaje</p>
                    <p className="font-semibold">
                      {ticket.trip.route.origin} → {ticket.trip.route.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.trip.departureTime), "HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Código QR</p>
                  <p className="font-mono text-sm break-all">{ticket.qrCode}</p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleValidate}
                    disabled={isValidating || ticket.status === "boarded"}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isValidating ? "Validando..." : ticket.status === "boarded" ? "Ya Validado" : "Validar y Abordar"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Escanear Otro
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manifest Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Manifest de Pasajeros</h2>
            <span className="text-sm text-muted-foreground">
              {manifest.filter((m) => m.validated).length} validados
            </span>
          </div>

          {manifest.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay pasajeros validados aún</p>
              <p className="text-sm mt-2">Escanea tickets para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {manifest.map((entry, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted/50 rounded-lg border border-border animate-fadeInUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{entry.ticket.passengerName}</span>
                        {entry.validated && (
                          <span className="text-xs px-2 py-0.5 bg-success text-success-foreground rounded-full">
                            ✓ Validado
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Asiento {entry.ticket.seat?.number} • {entry.ticket.trip.route.destination}
                      </div>
                    </div>
                    {entry.validatedAt && (
                      <div className="text-xs text-muted-foreground text-right">
                        {format(entry.validatedAt, "HH:mm")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
