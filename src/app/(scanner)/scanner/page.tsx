"use client";

import { useState, useEffect } from "react";
import { QRScanner } from "@/components/QRScanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { triggerSuccessFeedback, triggerErrorFeedback } from "@/lib/utils/feedback";
import { FeedbackAnimation } from "@/components/admin/FeedbackAnimation";
import { UniversalThemeToggle } from "@/components/ui/UniversalThemeToggle";

interface Ticket {
  id: string;
  qrCode: string;
  passengerName: string;
  status: string;
  price: number;
  totalPrice: number;
  trip?: {
    id: string;
    departureTime: string | Date;
    route?: {
      origin: string;
      destination: string;
    };
    origin?: string;
    destination?: string;
  };
  seat?: {
    number: string;
  };
}

interface ManifestEntry {
  ticket: Ticket;
  validated: boolean;
  validatedAt?: Date;
}

export default function AdminScannerPage() {
  const [scanned, setScanned] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    // Load manifest from localStorage on mount
    const savedManifest = localStorage.getItem("scanner_manifest");
    if (savedManifest) {
      try {
        setManifest(JSON.parse(savedManifest));
      } catch (e) {
        console.error("Error loading manifest:", e);
      }
    }
  }, []);

  const saveManifest = (newManifest: ManifestEntry[]) => {
    setManifest(newManifest);
    localStorage.setItem("scanner_manifest", JSON.stringify(newManifest));
  };

  const handleScanSuccess = async (qrCode: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/public/tickets?qr=${encodeURIComponent(qrCode)}`);
      const data = await response.json();
      if (response.ok && data.ticket) {
        const scannedTicket = data.ticket;
        
        // Check if ticket is already used or cancelled
        if (scannedTicket.status === "boarded") {
          triggerErrorFeedback();
          setFeedbackState("error");
          setError("Este ticket ya fue validado y usado");
          setTimeout(() => {
            setError(null);
            setFeedbackState(null);
          }, 3000);
          return;
        }
        
        if (scannedTicket.status === "cancelled") {
          triggerErrorFeedback();
          setFeedbackState("error");
          setError("Este ticket ha sido cancelado");
          setTimeout(() => {
            setError(null);
            setFeedbackState(null);
          }, 3000);
          return;
        }
        
        // Ticket is valid and can be used
        setTicket(scannedTicket);
        setScanned(true);
      } else {
        triggerErrorFeedback();
        setFeedbackState("error");
        setError("Ticket no encontrado");
        setTimeout(() => {
          setError(null);
          setFeedbackState(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
      triggerErrorFeedback();
      setFeedbackState("error");
      setError("Error al buscar el ticket");
      setTimeout(() => {
        setError(null);
        setFeedbackState(null);
      }, 3000);
    }
  };

  const handleValidate = async () => {
    if (!ticket) return;

    setIsValidating(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}/validate`, {
        method: "POST",
      });

      if (response.ok) {
        // Success feedback
        triggerSuccessFeedback();
        setFeedbackState("success");
        
        // Show success message with passenger name
        if (ticket) {
          setError(null);
          setSuccessMessage(`✓ Ticket validado exitosamente para ${ticket.passengerName}`);
          // Add to manifest
          const newEntry: ManifestEntry = {
            ticket,
            validated: true,
            validatedAt: new Date(),
          };
          const updatedManifest = [...manifest, newEntry];
          saveManifest(updatedManifest);
        }
        
        // Reset scanner after feedback animation
        setTimeout(() => {
          setScanned(false);
          setTicket(null);
          setFeedbackState(null);
          setSuccessMessage(null);
        }, 2000);
      } else {
        const errorData = await response.json();
        triggerErrorFeedback();
        setFeedbackState("error");
        setError(errorData.error || "Error al validar el ticket");
        setTimeout(() => {
          setError(null);
          setFeedbackState(null);
        }, 3000);
      }
    } catch (error) {
      console.error("Error validating ticket:", error);
      triggerErrorFeedback();
      setFeedbackState("error");
      setError("Error al validar el ticket");
      setTimeout(() => {
        setError(null);
        setFeedbackState(null);
      }, 3000);
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setTicket(null);
    setError(null);
  };

  const clearManifest = () => {
    if (confirm("¿Estás seguro de que deseas limpiar el manifest?")) {
      saveManifest([]);
      localStorage.removeItem("scanner_manifest");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-success";
      case "boarded":
        return "text-warning";
      case "cancelled":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Pagado";
      case "boarded":
        return "Abordado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Feedback Animation */}
      {feedbackState && (
        <FeedbackAnimation
          type={feedbackState}
          onComplete={() => setFeedbackState(null)}
        />
      )}
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Scanner QR - Validación de Tickets</h1>
            <p className="text-muted-foreground">Escanea códigos QR para validar pasajeros</p>
          </div>
          <div className="flex items-center gap-4">
            <UniversalThemeToggle />
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg animate-fadeIn">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="bg-success/10 border border-success/20 text-success p-4 rounded-lg animate-fadeIn">
                {successMessage}
              </div>
            )}

            {!scanned ? (
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Escanear Código QR</h2>
                <div className="bg-muted rounded-lg overflow-hidden">
                  <QRScanner onScanSuccess={handleScanSuccess} />
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg animate-scaleIn">
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
                        <p className={`font-semibold capitalize ${getStatusColor(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Precio</p>
                        <p className="font-semibold">${ticket.totalPrice?.toFixed(2) || ticket.price?.toFixed(2) || "0.00"}</p>
                      </div>
                      {ticket.trip && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Origen</p>
                            <p className="font-semibold">
                              {ticket.trip.route?.origin || ticket.trip.origin || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Destino</p>
                            <p className="font-semibold">
                              {ticket.trip.route?.destination || ticket.trip.destination || "N/A"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground mb-1">Salida</p>
                            <p className="font-semibold">
                              {format(new Date(ticket.trip.departureTime), "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: es })}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Código QR</p>
                      <p className="font-mono text-sm break-all">{ticket.qrCode}</p>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleValidate}
                        disabled={isValidating || ticket.status === "boarded" || ticket.status === "cancelled"}
                        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        {isValidating
                          ? "Validando..."
                          : ticket.status === "boarded"
                          ? "Ya Validado"
                          : ticket.status === "cancelled"
                          ? "Ticket Cancelado"
                          : "Validar y Abordar"}
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
          </div>

          {/* Manifest Section */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Manifest de Pasajeros</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {manifest.filter((m) => m.validated).length} validados
                </span>
                {manifest.length > 0 && (
                  <button
                    onClick={clearManifest}
                    className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {manifest.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay pasajeros validados aún</p>
                <p className="text-sm mt-2">Escanea tickets para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                          Asiento {entry.ticket.seat?.number || "N/A"} •{" "}
                          {entry.ticket.trip?.route?.destination ||
                            entry.ticket.trip?.destination ||
                            "N/A"}
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
    </div>
  );
}

