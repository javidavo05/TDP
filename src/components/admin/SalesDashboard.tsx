"use client";

import { useState, useEffect } from "react";

export function SalesDashboard() {
  const [sales, setSales] = useState({
    ticketsSold: 0,
    occupancyRate: 0,
    topRoutes: [] as { name: string; tickets: number; occupancy: number }[],
    terminalPerformance: [] as { name: string; tickets: number; revenue: number }[],
    demandAnalysis: [] as { hour: string; tickets: number }[],
  });

  useEffect(() => {
    // TODO: Fetch from API
    setSales({
      ticketsSold: 1250,
      occupancyRate: 78,
      topRoutes: [
        { name: "Panamá - David", tickets: 450, occupancy: 85 },
        { name: "David - Santiago", tickets: 320, occupancy: 75 },
        { name: "Santiago - Panamá", tickets: 480, occupancy: 90 },
      ],
      terminalPerformance: [
        { name: "Terminal David", tickets: 450, revenue: 11250 },
        { name: "Terminal Santiago", tickets: 350, revenue: 8750 },
        { name: "Terminal Panamá", tickets: 450, revenue: 11250 },
      ],
      demandAnalysis: [
        { hour: "06:00", tickets: 45 },
        { hour: "08:00", tickets: 120 },
        { hour: "10:00", tickets: 85 },
        { hour: "12:00", tickets: 150 },
        { hour: "14:00", tickets: 95 },
        { hour: "16:00", tickets: 180 },
        { hour: "18:00", tickets: 200 },
        { hour: "20:00", tickets: 75 },
      ],
    });
  }, []);

  const maxDemand = Math.max(...sales.demandAnalysis.map((d) => d.tickets));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard de Ventas</h2>
        <p className="text-muted-foreground">Métricas de tickets y ocupación</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Tickets Vendidos</h3>
            <span className="text-sm text-success">+8.2%</span>
          </div>
          <div className="text-4xl font-bold mb-2">{sales.ticketsSold.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">Este mes</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Tasa de Ocupación</h3>
            <span className="text-sm text-success">+5.1%</span>
          </div>
          <div className="text-4xl font-bold mb-2">{sales.occupancyRate}%</div>
          <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${sales.occupancyRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Routes */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Top Rutas</h3>
          <div className="space-y-4">
            {sales.topRoutes.map((route, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{route.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{route.tickets} tickets</span>
                    <span className="text-sm text-muted-foreground">{route.occupancy}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${route.occupancy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal Performance */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Performance por Terminal</h3>
          <div className="space-y-4">
            {sales.terminalPerformance.map((terminal, index) => (
              <div key={index} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{terminal.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{terminal.tickets} tickets</span>
                  <span className="font-semibold">${terminal.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demand Analysis */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Análisis de Demanda por Hora</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {sales.demandAnalysis.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col justify-end h-full">
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary-dark"
                    style={{ height: `${(item.tickets / maxDemand) * 100}%` }}
                    title={`${item.tickets} tickets`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{item.hour}</span>
                <span className="text-xs font-medium">{item.tickets}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

