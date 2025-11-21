import { TicketStatus } from "../types";

export class Ticket {
  constructor(
    public id: string,
    public userId: string | null,
    public tripId: string,
    public seatId: string,
    public qrCode: string,
    public qrToken: string | null,
    public status: TicketStatus,
    public passengerName: string,
    public passengerPhone: string | null,
    public passengerEmail: string | null,
    public boardingStopId: string | null,
    public destinationStopId: string,
    public price: number,
    public itbms: number,
    public totalPrice: number,
    public boardedAt: Date | null,
    public passengerId: string | null,
    public passengerDocumentId: string | null,
    public posSessionId: string | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    tripId: string;
    seatId: string;
    passengerName: string;
    destinationStopId: string;
    price: number;
    itbms: number;
    userId?: string;
    passengerPhone?: string;
    passengerEmail?: string;
    boardingStopId?: string;
    passengerId?: string;
    passengerDocumentId?: string;
  }): Ticket {
    const now = new Date();
    const qrCode = Ticket.generateQRCode();
    const totalPrice = data.price + data.itbms;

    return new Ticket(
      crypto.randomUUID(),
      data.userId || null,
      data.tripId,
      data.seatId,
      qrCode,
      null,
      "pending",
      data.passengerName,
      data.passengerPhone || null,
      data.passengerEmail || null,
      data.boardingStopId || null,
      data.destinationStopId,
      data.price,
      data.itbms,
      totalPrice,
      null,
      data.passengerId || null,
      data.passengerDocumentId || null,
      data.posSessionId || null,
      now,
      now
    );
  }

  private static generateQRCode(): string {
    // Generate unique QR code
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `TDP-${timestamp}-${random}`.toUpperCase();
  }

  generateShareToken(): string {
    if (!this.qrToken) {
      this.qrToken = crypto.randomUUID();
    }
    return this.qrToken;
  }

  markAsPaid(): void {
    if (this.status === "pending") {
      this.status = "paid";
    }
  }

  markAsBoarded(): void {
    if (this.status === "paid") {
      this.status = "boarded";
      this.boardedAt = new Date();
    }
  }

  markAsCompleted(): void {
    if (this.status === "boarded") {
      this.status = "completed";
    }
  }

  canCancel(): boolean {
    return ["pending", "paid"].includes(this.status);
  }

  cancel(): void {
    if (this.canCancel()) {
      this.status = "cancelled";
    }
  }
}

