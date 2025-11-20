/**
 * Thermal Printer Service
 * Handles printing tickets to thermal printers
 * Supports ESC/POS, Star, Epson, and other common thermal printer protocols
 */

export interface TicketPrintData {
  ticketId: string;
  qrCode: string;
  passengerName: string;
  seatNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  itbms: number;
  total: number;
  ticketNumber: string;
}

export class ThermalPrinterService {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== "undefined" && "electron" in window;
  }

  /**
   * Print ticket to thermal printer
   * In Electron: Uses IPC to communicate with main process
   * In Browser: Falls back to browser print dialog
   */
  async printTicket(data: TicketPrintData): Promise<{ success: boolean; error?: string }> {
    if (this.isElectron && (window as any).electron) {
      try {
        const result = await (window as any).electron.printTicket(data);
        return result;
      } catch (error) {
        console.error("Electron print error:", error);
        return { success: false, error: (error as Error).message };
      }
    }

    // Fallback to browser print for web version
    return this.printViaBrowser(data);
  }

  /**
   * Fallback: Print via browser print dialog
   */
  private async printViaBrowser(data: TicketPrintData): Promise<{ success: boolean; error?: string }> {
    try {
      // Create printable HTML
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        return { success: false, error: "Could not open print window" };
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${data.ticketNumber}</title>
            <style>
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 10mm;
                  font-family: monospace;
                  font-size: 12px;
                }
              }
              body {
                font-family: monospace;
                font-size: 12px;
                padding: 10mm;
                max-width: 80mm;
              }
              .header {
                text-align: center;
                border-bottom: 1px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .qr {
                text-align: center;
                margin: 20px 0;
              }
              .info {
                margin: 10px 0;
              }
              .footer {
                border-top: 1px dashed #000;
                padding-top: 10px;
                margin-top: 10px;
                text-align: center;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>TDP TICKETING</h2>
              <p>Ticket #${data.ticketNumber}</p>
            </div>
            <div class="info">
              <p><strong>Pasajero:</strong> ${data.passengerName}</p>
              <p><strong>Asiento:</strong> ${data.seatNumber}</p>
              <p><strong>Ruta:</strong> ${data.origin} → ${data.destination}</p>
              <p><strong>Salida:</strong> ${data.departureTime}</p>
            </div>
            <div class="qr">
              <p>Escanea el código QR para validar</p>
              <img src="${data.qrCode}" alt="QR Code" style="width: 150px; height: 150px;" />
            </div>
            <div class="info">
              <p><strong>Subtotal:</strong> $${data.price.toFixed(2)}</p>
              <p><strong>ITBMS (7%):</strong> $${data.itbms.toFixed(2)}</p>
              <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>
            </div>
            <div class="footer">
              <p>Gracias por viajar con nosotros</p>
              <p>${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      return { success: true };
    } catch (error) {
      console.error("Browser print error:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check if thermal printer is available
   */
  async checkPrinterAvailability(): Promise<boolean> {
    if (this.isElectron && (window as any).electron) {
      try {
        const info = await (window as any).electron.getSystemInfo();
        return info.hasPrinter || false;
      } catch {
        return false;
      }
    }
    return false;
  }
}

