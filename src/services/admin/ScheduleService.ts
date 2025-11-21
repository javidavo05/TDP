import { Schedule } from "@/domain/entities";
import { IScheduleRepository } from "@/domain/repositories/IScheduleRepository";

export class ScheduleService {
  constructor(private scheduleRepository: IScheduleRepository) {}

  async getScheduleById(id: string): Promise<Schedule | null> {
    return this.scheduleRepository.findById(id);
  }

  async getSchedulesByRoute(routeId: string): Promise<Schedule[]> {
    return this.scheduleRepository.findByRoute(routeId);
  }

  async getSchedulesByHour(hour: number): Promise<Schedule[]> {
    return this.scheduleRepository.findByHour(hour);
  }

  async createSchedule(data: {
    routeId: string;
    hour: number;
    isExpress?: boolean;
    expressPriceMultiplier?: number;
  }): Promise<Schedule> {
    const schedule = Schedule.create(data);
    return this.scheduleRepository.create(schedule);
  }

  async updateSchedule(schedule: Schedule): Promise<Schedule> {
    return this.scheduleRepository.update(schedule);
  }

  async deleteSchedule(id: string): Promise<void> {
    return this.scheduleRepository.delete(id);
  }

  async createAllHoursForRoute(routeId: string, isExpress: boolean = false): Promise<Schedule[]> {
    const schedules: Schedule[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const schedule = Schedule.create({
        routeId,
        hour,
        isExpress,
        expressPriceMultiplier: isExpress ? 1.2 : 1.0,
      });
      schedules.push(schedule);
    }
    
    // Create all schedules
    const created: Schedule[] = [];
    for (const schedule of schedules) {
      try {
        const createdSchedule = await this.scheduleRepository.create(schedule);
        created.push(createdSchedule);
      } catch (error) {
        // If schedule already exists, skip it
        console.warn(`Schedule for hour ${schedule.hour} already exists, skipping`);
      }
    }
    
    return created;
  }
}

