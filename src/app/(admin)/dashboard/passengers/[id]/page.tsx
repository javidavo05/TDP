"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Passenger {
  id: string;
  documentId: string;
  documentType: "cedula" | "pasaporte";
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Ticket {
  id: string;
  qrCode: string;
  status: string;
  price: number;
  totalPrice: number;
  createdAt: Date;
  trips?: {
    id: string;
    departure_time: string;
    routes?: {
      origin: string;
      destination: string;
    };
  };
  seats?: {
    seat_number: string;
  };
}

interface ManifestEntry {
  id: string;
  validated_at: string;
  trips?: {
    id: string;
    departure_time: string;
    routes?: {
      origin: string;
      destination: string;
    };
  };
}

export default function PassengerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPassengerData();
    }
  }, [params.id]);

  const fetchPassengerData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/passengers/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setPassenger(data.passenger);
        setTickets(data.tickets || []);
        setManifest(data.manifest || []);
      } else {
        console.error("Error fetching passenger:", data.error);
      }
    } catch (error) {
      console.error("Error fetching passenger:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!passenger) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">Pasajero no encontrado</div>
      </div>
    );
  }

  const totalSpent = tickets.reduce((sum, t) => sum + (t.totalPrice || t.price || 0), 0);
  const totalTrips = manifest.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/passengers"
              className="text-primary hover:text-primary-dark mb-2 inline-block"
            >
              ← Volver a Clientes
            </Link>
            <h1 className="text-3xl font-bold mb-2">{passenger.fullName}</h1>
            <p className="text-muted-foreground">Perfil del Pasajero</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Passenger Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Documento</p>
                  <p className="font-semibold">
                    <span className="capitalize">{passenger.documentType}</span>: {passenger.documentId}
                  </p>
                </div>
                {passenger.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                    <p className="font-semibold">{passenger.phone}</p>
                  </div>
                )}
                {passenger.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-semibold">{passenger.email}</p>
                  </div>
                )}
                {passenger.dateOfBirth && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fecha de Nacimiento</p>
                    <p className="font-semibold">
                      {format(new Date(passenger.dateOfBirth), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                )}
                {passenger.address && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Dirección</p>
                    <p className="font-semibold">{passenger.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cliente desde</p>
                  <p className="font-semibold">
                    {format(new Date(passenger.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Estadísticas</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total de Viajes</p>
                  <p className="text-2xl font-bold text-primary">{totalTrips}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Gastado</p>
                  <p className="text-2xl font-bold text-primary">${totalSpent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tickets Comprados</p>
                  <p className="text-2xl font-bold text-primary">{tickets.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tickets and History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Travel History */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Historial de Viajes</h2>
              {manifest.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay viajes registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {manifest.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {entry.trips?.routes?.origin || "N/A"} →{" "}
                            {entry.trips?.routes?.destination || "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(entry.validated_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                              locale: es,
                            })}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-success text-success-foreground rounded-full text-xs font-semibold">
                          Validado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tickets */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Tickets Comprados</h2>
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay tickets registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {ticket.trips?.routes?.origin || "N/A"} →{" "}
                            {ticket.trips?.routes?.destination || "N/A"}
                          </p>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>Asiento: {ticket.seats?.seat_number || "N/A"}</span>
                            {ticket.trips?.departure_time && (
                              <>
                                <span className="mx-2">•</span>
                                <span>
                                  {format(new Date(ticket.trips.departure_time), "dd/MM/yyyy HH:mm")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">${(ticket.totalPrice || ticket.price || 0).toFixed(2)}</p>
                          <p className={`text-xs capitalize ${
                            ticket.status === "paid" ? "text-success" :
                            ticket.status === "boarded" ? "text-warning" :
                            ticket.status === "cancelled" ? "text-destructive" :
                            "text-muted-foreground"
                          }`}>
                            {ticket.status === "paid" ? "Pagado" :
                             ticket.status === "boarded" ? "Abordado" :
                             ticket.status === "cancelled" ? "Cancelado" :
                             ticket.status}
                          </p>
                        </div>
                      </div>
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

