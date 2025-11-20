import { IGPSRepository, GPSLog } from "@/domain/repositories";
import { GPSCoordinates } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";

export class GPSRepository implements IGPSRepository {
  async log(tripId: string, busId: string, coordinates: GPSCoordinates): Promise<void> {
    await this.create({
      tripId,
      busId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      speed: coordinates.speed || null,
      heading: coordinates.heading || null,
      timestamp: new Date(),
    });
  }

  async create(log: GPSLog): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("gps_logs").insert({
      trip_id: log.tripId,
      bus_id: log.busId,
      latitude: log.latitude,
      longitude: log.longitude,
      speed: log.speed,
      heading: log.heading,
      timestamp: log.timestamp.toISOString(),
    });

    if (error) throw new Error(`Failed to create GPS log: ${error.message}`);
  }

  async getLatest(tripId: string): Promise<GPSCoordinates | null> {
    const latest = await this.getLatestByTrip(tripId);
    if (!latest) return null;

    return {
      latitude: latest.latitude,
      longitude: latest.longitude,
      speed: latest.speed || undefined,
      heading: latest.heading || undefined,
      timestamp: latest.timestamp,
    };
  }

  async getLatestByTrip(tripId: string): Promise<GPSLog | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("trip_id", tripId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return {
      tripId: data.trip_id,
      busId: data.bus_id,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      heading: data.heading,
      timestamp: new Date(data.timestamp),
    };
  }

  async getHistory(tripId: string, startDate?: Date, endDate?: Date): Promise<GPSCoordinates[]> {
    const logs = await this.getHistoryByTrip(tripId, 1000);
    
    let filtered = logs;
    if (startDate) {
      filtered = filtered.filter((log) => log.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((log) => log.timestamp <= endDate);
    }

    return filtered.map((log) => ({
      latitude: log.latitude,
      longitude: log.longitude,
      speed: log.speed || undefined,
      heading: log.heading || undefined,
      timestamp: log.timestamp,
    }));
  }

  async getHistoryByTrip(tripId: string, limit: number = 100): Promise<GPSLog[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("trip_id", tripId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get GPS history: ${error.message}`);

    return (data || []).map((d: any) => ({
      tripId: d.trip_id,
      busId: d.bus_id,
      latitude: d.latitude,
      longitude: d.longitude,
      speed: d.speed,
      heading: d.heading,
      timestamp: new Date(d.timestamp),
    }));
  }

  async getByBus(busId: string, limit: number = 100): Promise<GPSCoordinates[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gps_logs")
      .select("*")
      .eq("bus_id", busId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get GPS by bus: ${error.message}`);

    return (data || []).map((d: any) => ({
      latitude: d.latitude,
      longitude: d.longitude,
      speed: d.speed || undefined,
      heading: d.heading || undefined,
      timestamp: new Date(d.timestamp),
    }));
  }
}

