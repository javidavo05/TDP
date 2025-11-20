import { Ticket, Trip } from "@/domain/entities";
import { ITicketRepository, ITripRepository, IPassengerRepository } from "@/domain/repositories";
import { TripSearchFilters, TicketStatus, PaginationParams, PaginatedResponse } from "@/domain/types";
import { calculateITBMS, ITBMS_RATE } from "@/lib/constants";
import { PassengerService } from "@/services/admin/PassengerService";

export class TicketingService {
  private passengerService: PassengerService | null = null;

  constructor(
    private ticketRepository: ITicketRepository,
    private tripRepository: ITripRepository,
    passengerRepository?: IPassengerRepository
  ) {
    if (passengerRepository) {
      this.passengerService = new PassengerService(passengerRepository);
    }
  }

  async searchTrips(
    filters: TripSearchFilters,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Trip>> {
    return this.tripRepository.search(filters, params);
  }

  async getTripById(tripId: string): Promise<Trip | null> {
    return this.tripRepository.findById(tripId);
  }

  async getUpcomingTrips(hours: number = 24): Promise<Trip[]> {
    return this.tripRepository.findUpcoming(hours);
  }

  async createTicket(data: {
    tripId: string;
    seatId: string;
    passengerName: string;
    destinationStopId: string;
    price: number;
    userId?: string;
    passengerPhone?: string;
    passengerEmail?: string;
    boardingStopId?: string;
    passengerDocumentId?: string;
    passengerDocumentType?: "cedula" | "pasaporte";
  }): Promise<Ticket> {
    // Verify trip exists and is available
    const trip = await this.tripRepository.findById(data.tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    if (!trip.isAvailable()) {
      throw new Error("Trip is not available for booking");
    }

    // Check if seat is already taken
    const existingTicket = await this.ticketRepository.findBySeat(data.seatId, data.tripId);
    if (existingTicket) {
      throw new Error("Seat is already taken");
    }

    // Find or create passenger if document is provided
    let passengerId: string | null = null;
    if (data.passengerDocumentId && data.passengerDocumentType && this.passengerService) {
      try {
        const passenger = await this.passengerService.findOrCreatePassenger({
          documentId: data.passengerDocumentId,
          documentType: data.passengerDocumentType,
          fullName: data.passengerName,
          phone: data.passengerPhone,
          email: data.passengerEmail,
        });
        passengerId = passenger.id;
      } catch (error) {
        console.warn("Failed to create/find passenger:", error);
        // Continue without passenger if creation fails
      }
    }

    // Calculate ITBMS
    const itbms = calculateITBMS(data.price, ITBMS_RATE);

    // Create ticket
    const ticket = Ticket.create({
      tripId: data.tripId,
      seatId: data.seatId,
      passengerName: data.passengerName,
      destinationStopId: data.destinationStopId,
      price: data.price,
      itbms,
      userId: data.userId,
      passengerPhone: data.passengerPhone,
      passengerEmail: data.passengerEmail,
      boardingStopId: data.boardingStopId,
      passengerId: passengerId || undefined,
      passengerDocumentId: data.passengerDocumentId,
    });

    // Reserve seat in trip
    if (!trip.reserveSeat()) {
      throw new Error("No available seats");
    }

    // Save ticket and update trip
    const savedTicket = await this.ticketRepository.create(ticket);
    await this.tripRepository.update(trip);

    return savedTicket;
  }

  async confirmTicketPayment(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "pending") {
      throw new Error(`Ticket is already ${ticket.status}`);
    }

    ticket.markAsPaid();
    return this.ticketRepository.update(ticket.id, { status: ticket.status });
  }

  async getUserTickets(userId: string, params?: PaginationParams): Promise<PaginatedResponse<Ticket>> {
    return this.ticketRepository.findByUser(userId, params);
  }

  async getTicketById(ticketId: string, userId?: string): Promise<Ticket | null> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) return null;

    // Check access
    if (userId && ticket.userId !== userId) {
      return null;
    }

    return ticket;
  }

  async getTicketByQR(qrCode: string): Promise<Ticket | null> {
    return this.ticketRepository.findByQRCode(qrCode);
  }

  async getTicketByShareToken(token: string): Promise<Ticket | null> {
    return this.ticketRepository.findByQRToken(token);
  }

  async cancelTicket(ticketId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.userId !== userId) {
      throw new Error("Unauthorized");
    }

    if (!ticket.canCancel()) {
      throw new Error("Ticket cannot be cancelled");
    }

    // Release seat
    const trip = await this.tripRepository.findById(ticket.tripId);
    if (trip) {
      trip.releaseSeat();
      await this.tripRepository.update(trip);
    }

    ticket.cancel();
    return this.ticketRepository.update(ticket.id, { status: ticket.status });
  }

  async generateShareToken(ticketId: string, userId: string): Promise<string> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const token = ticket.generateShareToken();
    await this.ticketRepository.update(ticket.id, { qrToken: ticket.qrToken });
    return token;
  }

  async getTripSeatAvailability(tripId: string): Promise<{
    totalSeats: number;
    availableSeats: number;
    occupiedSeats: number;
    seats: Array<{
      seatId: string;
      seatNumber: string;
      isAvailable: boolean;
    }>;
  }> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    const tickets = await this.ticketRepository.findByTrip(tripId);
    const occupiedSeatIds = new Set(tickets.map((t) => t.seatId));

    // Note: In a real implementation, we'd fetch seat details from the bus
    // For now, we return basic availability info
    return {
      totalSeats: trip.totalSeats,
      availableSeats: trip.availableSeats,
      occupiedSeats: trip.totalSeats - trip.availableSeats,
      seats: [], // Would be populated with actual seat data from bus
    };
  }
}

