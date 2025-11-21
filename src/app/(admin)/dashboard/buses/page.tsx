"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";

interface Bus {
  id: string;
  plateNumber: string;
  unitNumber: string | null;
  model: string | null;
  capacity: number;
  ownerId: string;
  odometer?: number;
  totalDistanceTraveled?: number;
  lastTripDate?: string | null;
}

interface BusOwner {
  id: string;
  companyName: string;
  userId: string;
  phone?: string | null;
  user?: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function BusesManagementPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busOwners, setBusOwners] = useState<BusOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUnitNumber, setFilterUnitNumber] = useState("");
  const [filterPlate, setFilterPlate] = useState("");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  useEffect(() => {
    fetchBuses();
    fetchBusOwners();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/buses");
      const data = await response.json();
      
      if (response.ok) {
        setBuses(data.buses || []);
      } else {
        console.error("Error fetching buses:", data.error);
        setBuses([]);
      }
    } catch (error) {
      console.error("Error fetching buses:", error);
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusOwners = async () => {
    try {
      const response = await fetch("/api/admin/bus-owners");
      const data = await response.json();
      
      if (response.ok) {
        // Map API response to frontend format
        const mappedOwners = (data.busOwners || []).map((owner: any) => ({
          id: owner.id,
          companyName: owner.company_name || owner.companyName,
          userId: owner.user_id || owner.userId,
          phone: owner.phone || null,
          user: owner.user ? {
            id: owner.user.id,
            fullName: owner.user.full_name || owner.user.fullName,
            email: owner.user.email,
            phone: owner.user.phone,
          } : null,
        }));
        setBusOwners(mappedOwners);
      }
    } catch (error) {
      console.error("Error fetching bus owners:", error);
    }
  };

  // Group buses by owner
  const busesByOwner = useMemo(() => {
    const grouped: Record<string, { owner: BusOwner; buses: Bus[] }> = {};
    
    buses.forEach((bus) => {
      const owner = busOwners.find((o) => o.id === bus.ownerId);
      if (owner) {
        if (!grouped[owner.id]) {
          grouped[owner.id] = { owner, buses: [] };
        }
        grouped[owner.id].buses.push(bus);
      }
    });

    return grouped;
  }, [buses, busOwners]);

  // Filter buses
  const filteredBuses = useMemo(() => {
    let filtered = buses;

    // Filter by unit number
    if (filterUnitNumber) {
      filtered = filtered.filter((bus) =>
        bus.unitNumber?.toLowerCase().includes(filterUnitNumber.toLowerCase())
      );
    }

    // Filter by plate
    if (filterPlate) {
      filtered = filtered.filter((bus) =>
        bus.plateNumber.toLowerCase().includes(filterPlate.toLowerCase())
      );
    }

    // Filter by owner
    if (filterOwner !== "all") {
      filtered = filtered.filter((bus) => bus.ownerId === filterOwner);
    }

    return filtered;
  }, [buses, filterUnitNumber, filterPlate, filterOwner]);

  // Group filtered buses by owner
  const filteredBusesByOwner = useMemo(() => {
    const grouped: Record<string, { owner: BusOwner; buses: Bus[] }> = {};
    
    filteredBuses.forEach((bus) => {
      const owner = busOwners.find((o) => o.id === bus.ownerId);
      if (owner) {
        if (!grouped[owner.id]) {
          grouped[owner.id] = { owner, buses: [] };
        }
        grouped[owner.id].buses.push(bus);
      }
    });

    return grouped;
  }, [filteredBuses, busOwners]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestión de Flotas</h1>
          <Link
            href="/dashboard/buses/new"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold"
          >
            Nuevo Bus
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter by Unit Number */}
            <div>
              <label className="block text-sm font-medium mb-2">Número de Unidad</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filterUnitNumber}
                  onChange={(e) => setFilterUnitNumber(e.target.value)}
                  placeholder="Buscar por unidad..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Filter by Plate */}
            <div>
              <label className="block text-sm font-medium mb-2">Placa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filterPlate}
                  onChange={(e) => setFilterPlate(e.target.value)}
                  placeholder="Buscar por placa..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Filter by Owner */}
            <div>
              <label className="block text-sm font-medium mb-2">Dueño</label>
              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Todos los dueños</option>
                {busOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : Object.keys(filteredBusesByOwner).length === 0 ? (
          <div className="bg-card p-8 rounded-lg shadow-md text-center">
            <p className="text-muted-foreground mb-4">
              {filterUnitNumber || filterPlate || filterOwner !== "all"
                ? "No se encontraron buses con los filtros aplicados"
                : "No hay buses registrados"}
            </p>
            {!filterUnitNumber && !filterPlate && filterOwner === "all" && (
              <Link
                href="/dashboard/buses/new"
                className="text-primary hover:underline"
              >
                Crear primer bus
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(filteredBusesByOwner).map(({ owner, buses: ownerBuses }) => (
              <div key={owner.id} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{owner.companyName}</h2>
                    <div className="mt-2 space-y-1">
                      {owner.user?.fullName && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Propietario:</span> {owner.user.fullName}
                        </p>
                      )}
                      {owner.user?.email && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Correo:</span> {owner.user.email}
                        </p>
                      )}
                      {(owner.phone || owner.user?.phone) && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Contacto:</span> {owner.phone || owner.user?.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-semibold ml-4">
                    {ownerBuses.length} {ownerBuses.length === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownerBuses.map((bus) => (
                    <Link
                      key={bus.id}
                      href={`/dashboard/buses/${bus.id}`}
                      className="bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">{bus.plateNumber}</h3>
                          {bus.unitNumber && (
                            <p className="text-sm text-muted-foreground">
                              Unidad: {bus.unitNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        {bus.model && (
                          <p className="text-muted-foreground">Modelo: {bus.model}</p>
                        )}
                        <p className="text-muted-foreground">Capacidad: {bus.capacity} asientos</p>
                        {bus.totalDistanceTraveled !== undefined && (
                          <p className="text-muted-foreground">
                            Kilometraje: {bus.totalDistanceTraveled.toFixed(2)} km
                          </p>
                        )}
                        {bus.lastTripDate && (
                          <p className="text-xs text-muted-foreground">
                            Último viaje: {new Date(bus.lastTripDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
