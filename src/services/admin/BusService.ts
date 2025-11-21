import { Bus } from "@/domain/entities";
import { IBusRepository } from "@/domain/repositories";
import { BusClass, SeatMap, BusFeatures } from "@/domain/types";

export class BusService {
  constructor(private busRepository: IBusRepository) {}

  async createBus(data: {
    ownerId: string;
    plateNumber: string;
    capacity: number;
    seatMap: SeatMap;
    busClass?: BusClass;
    features?: BusFeatures;
    model?: string;
    year?: number;
    presetId?: string;
    unitNumber?: string;
    mechanicalNotes?: string;
    odometer?: number;
  }): Promise<Bus> {
    const bus = Bus.create(data);
    if (data.odometer !== undefined) {
      bus.odometer = data.odometer;
    }
    return this.busRepository.create(bus);
  }

  async getBusById(id: string): Promise<Bus | null> {
    return this.busRepository.findById(id);
  }

  async updateBus(id: string, data: Partial<{
    plateNumber: string;
    unitNumber: string | null;
    model: string | null;
    year: number | null;
    capacity: number;
    busClass: BusClass;
    features: BusFeatures;
    mechanicalNotes: string | null;
    seatMap: SeatMap;
    isActive: boolean;
    odometer?: number;
  }>): Promise<Bus> {
    const existingBus = await this.busRepository.findById(id);
    if (!existingBus) {
      throw new Error("Bus not found");
    }

    // Merge existing data with updates
    const updatedBus = new Bus(
      existingBus.id,
      existingBus.ownerId,
      existingBus.presetId,
      data.plateNumber ?? existingBus.plateNumber,
      data.unitNumber !== undefined ? data.unitNumber : existingBus.unitNumber,
      data.model !== undefined ? data.model : existingBus.model,
      data.year !== undefined ? data.year : existingBus.year,
      data.capacity ?? existingBus.capacity,
      data.seatMap ?? existingBus.seatMap,
      data.busClass ?? existingBus.busClass,
      data.features ?? existingBus.features,
      data.mechanicalNotes !== undefined ? data.mechanicalNotes : existingBus.mechanicalNotes,
      data.isActive !== undefined ? data.isActive : existingBus.isActive,
      existingBus.createdAt,
      new Date(), // updatedAt
      data.odometer !== undefined ? data.odometer : existingBus.odometer,
      existingBus.totalDistanceTraveled,
      existingBus.lastTripDate
    );

    return this.busRepository.update(updatedBus);
  }

  async deleteBus(id: string): Promise<void> {
    return this.busRepository.delete(id);
  }
}

