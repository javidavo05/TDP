import { Passenger } from "@/domain/entities/Passenger";
import { IPassengerRepository } from "@/domain/repositories/IPassengerRepository";
import { PaginationParams, PaginatedResponse } from "@/domain/types";

export class PassengerService {
  constructor(private passengerRepository: IPassengerRepository) {}

  async getPassengerById(id: string): Promise<Passenger | null> {
    return this.passengerRepository.findById(id);
  }

  async getPassengerByDocument(documentId: string): Promise<Passenger | null> {
    return this.passengerRepository.findByDocumentId(documentId);
  }

  async findOrCreatePassenger(data: {
    documentId: string;
    documentType: "cedula" | "pasaporte";
    fullName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: Date;
    address?: string;
  }): Promise<Passenger> {
    // Validate document format
    if (!Passenger.validateDocument(data.documentId, data.documentType)) {
      throw new Error(`Invalid ${data.documentType} format`);
    }

    // Try to find existing passenger
    let passenger = await this.passengerRepository.findByDocumentId(data.documentId);

    if (passenger) {
      // Update passenger info if provided
      if (data.fullName || data.phone || data.email || data.dateOfBirth || data.address) {
        passenger.update({
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
        });
        return this.passengerRepository.update(passenger);
      }
      return passenger;
    }

    // Create new passenger
    passenger = Passenger.create(data);
    return this.passengerRepository.create(passenger);
  }

  async listPassengers(params?: PaginationParams): Promise<PaginatedResponse<Passenger>> {
    return this.passengerRepository.findAll(params);
  }

  async searchPassengers(query: string, params?: PaginationParams): Promise<PaginatedResponse<Passenger>> {
    return this.passengerRepository.search(query, params);
  }

  async updatePassenger(id: string, data: {
    fullName?: string;
    phone?: string;
    email?: string;
    dateOfBirth?: Date;
    address?: string;
  }): Promise<Passenger> {
    const passenger = await this.passengerRepository.findById(id);
    if (!passenger) {
      throw new Error("Passenger not found");
    }

    passenger.update(data);
    return this.passengerRepository.update(passenger);
  }

  async deletePassenger(id: string): Promise<void> {
    await this.passengerRepository.delete(id);
  }
}

