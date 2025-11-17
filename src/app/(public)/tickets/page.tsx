"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/public/tickets");
      if (response.ok) {
        const data = await response.json();
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Mis Tickets</h1>

        {tickets.length === 0 ? (
          <div className="bg-card p-8 rounded-lg shadow-md text-center">
            <p className="text-muted-foreground mb-4">No tienes tickets aún</p>
            <Link href="/search" className="text-primary hover:underline">
              Buscar viajes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="block bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{ticket.passengerName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(ticket.createdAt)}
                    </p>
                    <p className="text-sm mt-2">
                      Estado: <span className="font-medium">{ticket.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${ticket.totalPrice.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Código: {ticket.qrCode}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

