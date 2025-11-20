import { IThermalDriver } from "@/infrastructure/thermal/IThermalDriver";

export interface TicketData {
  ticketNumber: string;
  qrCode: string;
  passengerName: string;
  passengerId: string;
  origin: string;
  destination: string;
  departureTime: Date;
  seatNumber: string;
  price: number;
  itbms: number;
  total: number;
  purchaseDate: Date;
}

export class ThermalPrinterService {
  constructor(private driver: IThermalDriver) {}

  async initialize(): Promise<void> {
    await this.driver.initialize();
  }

  async printTicket(ticket: TicketData): Promise<void> {
    // Format ticket for thermal printing
    const lines: string[] = [];

    // Header
    lines.push("=".repeat(32));
    lines.push("TDP TRANSPORTE");
    lines.push("BOLETO DE VIAJE");
    lines.push("=".repeat(32));
    lines.push("");

    // Ticket info
    lines.push(`Boleto: ${ticket.ticketNumber}`);
    lines.push(`Fecha: ${ticket.purchaseDate.toLocaleString("es-PA")}`);
    lines.push("");

    // Passenger info
    lines.push("PASAJERO:");
    lines.push(ticket.passengerName);
    lines.push(`ID: ${ticket.passengerId}`);
    lines.push("");

    // Trip info
    lines.push("VIAJE:");
    lines.push(`${ticket.origin} → ${ticket.destination}`);
    lines.push(`Salida: ${ticket.departureTime.toLocaleString("es-PA")}`);
    lines.push(`Asiento: ${ticket.seatNumber}`);
    lines.push("");

    // Pricing
    lines.push("-".repeat(32));
    lines.push(`Precio: $${ticket.price.toFixed(2)}`);
    lines.push(`ITBMS: $${ticket.itbms.toFixed(2)}`);
    lines.push(`TOTAL: $${ticket.total.toFixed(2)}`);
    lines.push("");

    // QR Code (as text representation)
    lines.push("CODIGO QR:");
    lines.push(ticket.qrCode);
    lines.push("");

    // Footer
    lines.push("=".repeat(32));
    lines.push("Gracias por viajar con nosotros");
    lines.push("=".repeat(32));
    lines.push("");
    lines.push("");
    lines.push(""); // Extra space for cutting

    await this.driver.print(lines);
  }

  async printTestPage(): Promise<void> {
    const lines: string[] = [];
    lines.push("=".repeat(32));
    lines.push("PAGINA DE PRUEBA");
    lines.push("=".repeat(32));
    lines.push("");
    lines.push("Impresora: OK");
    lines.push(`Fecha: ${new Date().toLocaleString("es-PA")}`);
    lines.push("");
    lines.push("=".repeat(32));
    lines.push("");
    lines.push("");
    lines.push("");

    await this.driver.print(lines);
  }

  async getStatus(): Promise<{ online: boolean; paperStatus: string; error?: string }> {
    return this.driver.getStatus();
  }
}
