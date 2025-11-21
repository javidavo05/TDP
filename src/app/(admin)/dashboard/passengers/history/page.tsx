"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, User, Mail, Phone, Award, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Ticket {
  id: string;
  passenger_name: string;
  passenger_email: string | null;
  passenger_document_id: string;
  passenger_document_type: string;
  seat_id: string;
  price: number;
  total_price: number;
  status: string;
  created_at: string;
  trips: {
    id: string;
    departure_time: string;
    arrival_estimate: string | null;
    price: number;
    status: string;
    routes: {
      id: string;
      name: string;
      origin: string;
      destination: string;
    };
    buses: {
      id: string;
      plate_number: string;
      unit_number: string | null;
      bus_class: string;
    };
  };
}

interface PassengerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string;
  documentType: string;
  totalTrips: number;
  loyaltyPoints: number;
  loyaltyTier: string;
}

export default function PassengerHistoryPage() {
  const [documentId, setDocumentId] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [passengerSummary, setPassengerSummary] = useState<PassengerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!documentId.trim()) {
      setTickets([]);
      setPassengerSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/passengers/history?documentId=${encodeURIComponent(documentId)}`);
      const data = await response.json();

      if (response.ok) {
        setTickets(data.tickets || []);
        setPassengerSummary(data.passengerSummary || null);
      } else {
        setError(data.error || "Error al cargar el historial");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const getLoyaltyTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "platinum":
        return "text-purple-600 bg-purple-100";
      case "gold":
        return "text-yellow-600 bg-yellow-100";
      case "silver":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-orange-600 bg-orange-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "used":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Pasajeros</h1>
          <p className="text-muted-foreground mt-1">
            Consulta el historial completo de viajes por número de cédula
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Volver al Dashboard</Button>
        </Link>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Pasajero</CardTitle>
          <CardDescription>
            Ingresa el número de cédula o pasaporte para ver el historial completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Ej: 8-1234-5678 o A123456"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Passenger Summary */}
      {passengerSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Pasajero
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-semibold">{passengerSummary.name}</p>
              </div>
              {passengerSummary.email && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </p>
                  <p className="font-semibold">{passengerSummary.email}</p>
                </div>
              )}
              {passengerSummary.phone && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono
                  </p>
                  <p className="font-semibold">{passengerSummary.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Documento</p>
                <p className="font-semibold">
                  {passengerSummary.documentId} ({passengerSummary.documentType})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total de Viajes</p>
                <p className="text-2xl font-bold">{passengerSummary.totalTrips}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <Award className="h-4 w-4" />
                  Puntos de Lealtad
                </p>
                <p className="text-2xl font-bold">{passengerSummary.loyaltyPoints}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Nivel de Lealtad
                </p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${getLoyaltyTierColor(
                    passengerSummary.loyaltyTier
                  )}`}
                >
                  {passengerSummary.loyaltyTier}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets History */}
      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Viajes ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {ticket.trips.routes.origin} → {ticket.trips.routes.destination}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(ticket.trips.departure_time), "PPP 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Bus</p>
                      <p className="font-medium">
                        {ticket.trips.buses.plate_number}
                        {ticket.trips.buses.unit_number && ` (${ticket.trips.buses.unit_number})`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Asiento</p>
                      <p className="font-medium">#{ticket.seat_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Precio</p>
                      <p className="font-medium">${ticket.total_price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de Compra</p>
                      <p className="font-medium">
                        {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && documentId && tickets.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No se encontraron viajes para este pasajero
          </CardContent>
        </Card>
      )}
    </div>
  );
}

