"use client";

interface ProfileStatsProps {
  totalTrips: number;
  totalSpent: number;
  favoriteDestinations: string[];
}

export function ProfileStats({ totalTrips, totalSpent, favoriteDestinations }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-center animate-fadeInUp">
        <div className="text-3xl font-bold text-primary mb-2">{totalTrips}</div>
        <div className="text-sm text-muted-foreground">Viajes Realizados</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-center animate-fadeInUp" style={{ animationDelay: "100ms" }}>
        <div className="text-3xl font-bold text-primary mb-2">${totalSpent.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground">Total Gastado</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg text-center animate-fadeInUp" style={{ animationDelay: "200ms" }}>
        <div className="text-3xl font-bold text-primary mb-2">{favoriteDestinations.length}</div>
        <div className="text-sm text-muted-foreground">Destinos Visitados</div>
      </div>
    </div>
  );
}

