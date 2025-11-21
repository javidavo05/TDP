import { Schedule } from "../entities";

export interface IScheduleRepository {
  findById(id: string): Promise<Schedule | null>;
  findByRoute(routeId: string): Promise<Schedule[]>;
  findByHour(hour: number): Promise<Schedule[]>;
  create(schedule: Schedule): Promise<Schedule>;
  update(schedule: Schedule): Promise<Schedule>;
  delete(id: string): Promise<void>;
}

