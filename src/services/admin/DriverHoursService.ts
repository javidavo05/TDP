import { DriverHours, DriverHoursConfig } from "@/domain/entities";
import { IDriverHoursRepository } from "@/domain/repositories/IDriverHoursRepository";
import { IDriverHoursConfigRepository } from "@/domain/repositories/IDriverHoursConfigRepository";

export interface HoursSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastRestPeriod: number; // Hours since last rest
}

export class DriverHoursService {
  constructor(
    private hoursRepository: IDriverHoursRepository,
    private configRepository: IDriverHoursConfigRepository
  ) {}

  async getConfig(): Promise<DriverHoursConfig> {
    let config = await this.configRepository.getConfig();
    if (!config) {
      config = DriverHoursConfig.default();
      config = await this.configRepository.createConfig(config);
    }
    return config;
  }

  async updateConfig(config: DriverHoursConfig): Promise<DriverHoursConfig> {
    return this.configRepository.updateConfig(config);
  }

  async startTrip(driverId: string, tripId: string, startTime: Date): Promise<DriverHours> {
    const date = new Date(startTime);
    date.setHours(0, 0, 0, 0);

    const hours = DriverHours.create({
      driverId,
      tripId,
      startTime,
      date,
    });

    return this.hoursRepository.create(hours);
  }

  async endTrip(tripId: string, endTime: Date): Promise<DriverHours> {
    const hours = await this.hoursRepository.findByTrip(tripId);
    if (!hours) {
      throw new Error(`Driver hours not found for trip ${tripId}`);
    }

    hours.endTime = endTime;
    hours.hoursWorked = hours.calculateHours();

    return this.hoursRepository.update(hours);
  }

  async getDriverHoursSummary(driverId: string, referenceDate: Date = new Date()): Promise<HoursSummary> {
    // Get today's hours
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const todayHours = await this.hoursRepository.findByDriverAndDate(driverId, today);
    const todayTotal = todayHours.reduce((sum, h) => sum + h.hoursWorked, 0);

    // Get this week's hours (Monday to Sunday)
    const weekStart = new Date(referenceDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekHours = await this.hoursRepository.findByDriverAndDateRange(driverId, weekStart, weekEnd);
    const weekTotal = weekHours.reduce((sum, h) => sum + h.hoursWorked, 0);

    // Get this month's hours
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthHours = await this.hoursRepository.findByDriverAndDateRange(driverId, monthStart, monthEnd);
    const monthTotal = monthHours.reduce((sum, h) => sum + h.hoursWorked, 0);

    // Calculate last rest period
    const allHours = await this.hoursRepository.findByDriver(driverId, { limit: 100 });
    const sortedHours = allHours.data.sort((a, b) => b.endTime!.getTime() - a.endTime!.getTime());
    const lastEndTime = sortedHours.find(h => h.endTime)?.endTime;
    const lastRestPeriod = lastEndTime 
      ? (referenceDate.getTime() - lastEndTime.getTime()) / (1000 * 60 * 60)
      : 24; // Default to 24 hours if no previous work

    return {
      today: todayTotal,
      thisWeek: weekTotal,
      thisMonth: monthTotal,
      lastRestPeriod,
    };
  }

  async canAssignTrip(driverId: string, tripStartTime: Date): Promise<{ allowed: boolean; reason?: string }> {
    const config = await this.getConfig();
    const summary = await this.getDriverHoursSummary(driverId, tripStartTime);

    // Check daily limit
    if (summary.today >= config.maxHoursPerDay) {
      return {
        allowed: false,
        reason: `El chofer ha alcanzado el límite diario de ${config.maxHoursPerDay} horas`,
      };
    }

    // Check weekly limit
    if (summary.thisWeek >= config.maxHoursPerWeek) {
      return {
        allowed: false,
        reason: `El chofer ha alcanzado el límite semanal de ${config.maxHoursPerWeek} horas`,
      };
    }

    // Check monthly limit
    if (summary.thisMonth >= config.maxHoursPerMonth) {
      return {
        allowed: false,
        reason: `El chofer ha alcanzado el límite mensual de ${config.maxHoursPerMonth} horas`,
      };
    }

    // Check rest period
    if (summary.lastRestPeriod < config.restHoursRequired) {
      return {
        allowed: false,
        reason: `El chofer necesita ${config.restHoursRequired} horas de descanso. Tiempo desde último viaje: ${summary.lastRestPeriod.toFixed(1)} horas`,
      };
    }

    return { allowed: true };
  }

  async getDriverHoursByDateRange(driverId: string, startDate: Date, endDate: Date): Promise<DriverHours[]> {
    return this.hoursRepository.findByDriverAndDateRange(driverId, startDate, endDate);
  }
}

