"use client";

import { HeroSection } from "@/components/public/HeroSection";
import { TripCard } from "@/components/public/TripCard";
import { useEffect, useState } from "react";

interface UpcomingTrip {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string | null;
  price: number;
  availableSeats: number;
  totalSeats: number;
  busClass: string;
  bus: {
    features: {
      wifi?: boolean;
      ac?: boolean;
      bathroom?: boolean;
    };
  };
}

export default function PublicLandingPage() {
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingTrips();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUpcomingTrips, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/public/trips/upcoming");
      const data = await response.json();
      
      if (response.ok) {
        setUpcomingTrips(data.trips || []);
      } else {
        setError(data.error || "Error al cargar los viajes");
      }
    } catch (err) {
      console.error("Error fetching upcoming trips:", err);
      setError("Error al cargar los viajes");
    } finally {
      setLoading(false);
    }
  };

  const getBusClassLabel = (busClass: string): string => {
    const labels: Record<string, string> = {
      economico: "Económico",
      ejecutivo: "Ejecutivo",
      premium: "Premium",
    };
    return labels[busClass] || busClass;
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <HeroSection />

      {/* Upcoming Trips Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeInUp">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Próximos Viajes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubre las mejores opciones de viaje disponibles hoy
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Cargando viajes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : upcomingTrips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay viajes disponibles en este momento</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTrips.map((trip, index) => (
                  <div
                    key={trip.id}
                    className="animate-fadeInUp"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <TripCard 
                      trip={{
                        ...trip,
                        busClass: getBusClassLabel(trip.busClass),
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* View All Link */}
              <div className="text-center mt-12 animate-fadeInUp" style={{ animationDelay: "400ms" }}>
                <a
                  href="/search"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold transition-colors"
                >
                  Ver todos los viajes
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center animate-fadeInUp">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pago Seguro</h3>
              <p className="text-muted-foreground">
                Transacciones protegidas con los más altos estándares de seguridad
              </p>
            </div>

            <div className="text-center animate-fadeInUp" style={{ animationDelay: "200ms" }}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Asientos Garantizados</h3>
              <p className="text-muted-foreground">
                Selecciona tu asiento preferido al momento de la compra
              </p>
            </div>

            <div className="text-center animate-fadeInUp" style={{ animationDelay: "400ms" }}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Cancelación Flexible</h3>
              <p className="text-muted-foreground">
                Cancela o modifica tu viaje con facilidad según nuestras políticas
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

