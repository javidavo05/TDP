"use client";

import { useState } from "react";
import { QRScanner } from "@/components/QRScanner";

export default function AssistantMobilePage() {
  const [scanned, setScanned] = useState(false);
  const [ticket, setTicket] = useState<any>(null);

  const handleScanSuccess = async (qrCode: string) => {
    try {
      const response = await fetch(`/api/public/tickets?qr=${qrCode}`);
      const data = await response.json();
      if (response.ok) {
        setTicket(data.ticket);
        setScanned(true);
      }
    } catch (error) {
      console.error("Error validating ticket:", error);
    }
  };

  const handleValidate = async () => {
    if (!ticket) return;

    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}/validate`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Ticket validado exitosamente");
        setScanned(false);
        setTicket(null);
      }
    } catch (error) {
      console.error("Error validating ticket:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-6">Validar Tickets</h1>

      {!scanned ? (
        <div>
          <QRScanner onScanSuccess={handleScanSuccess} />
        </div>
      ) : (
        <div className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Ticket Encontrado</h2>
          {ticket && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Pasajero</p>
                <p className="font-semibold">{ticket.passengerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-semibold capitalize">{ticket.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-mono text-sm">{ticket.qrCode}</p>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleValidate}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Validar
                </button>
                <button
                  onClick={() => {
                    setScanned(false);
                    setTicket(null);
                  }}
                  className="flex-1 px-6 py-3 border rounded-lg hover:bg-muted"
                >
                  Escanear Otro
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

