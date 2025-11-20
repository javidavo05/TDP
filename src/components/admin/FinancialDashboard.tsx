"use client";

import { useState, useEffect } from "react";

export function FinancialDashboard() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [revenue, setRevenue] = useState({
    total: 0,
    byTerminal: [] as { name: string; amount: number }[],
    byRoute: [] as { name: string; amount: number }[],
    byMethod: [] as { method: string; amount: number }[],
    trend: [] as { date: string; amount: number }[],
  });

  useEffect(() => {
    // TODO: Fetch from API
    setRevenue({
      total: 125000,
      byTerminal: [
        { name: "Terminal David", amount: 45000 },
        { name: "Terminal Santiago", amount: 35000 },
        { name: "Terminal Panamá", amount: 45000 },
      ],
      byRoute: [
        { name: "Panamá - David", amount: 45000 },
        { name: "David - Santiago", amount: 30000 },
        { name: "Santiago - Panamá", amount: 50000 },
      ],
      byMethod: [
        { method: "Yappy", amount: 50000 },
        { method: "Efectivo", amount: 40000 },
        { method: "Tarjeta", amount: 35000 },
      ],
      trend: [
        { date: "Lun", amount: 15000 },
        { date: "Mar", amount: 18000 },
        { date: "Mié", amount: 20000 },
        { date: "Jue", amount: 22000 },
        { date: "Vie", amount: 25000 },
        { date: "Sáb", amount: 15000 },
        { date: "Dom", amount: 0 },
      ],
    });
  }, [period]);

  const maxTrend = Math.max(...revenue.trend.map((t) => t.amount));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Dashboard Financiero</h2>
          <p className="text-muted-foreground">Análisis de ingresos y ventas</p>
        </div>
        <div className="flex gap-2">
          {(["day", "week", "month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p === "day" ? "Día" : p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Revenue Total</h3>
          <span className="text-sm text-success">+12.5%</span>
        </div>
        <div className="text-4xl font-bold mb-2">${revenue.total.toLocaleString()}</div>
        <p className="text-sm text-muted-foreground">USD</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Revenue</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {revenue.trend.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col justify-end h-full">
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary-dark"
                    style={{ height: `${(item.amount / maxTrend) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{item.date}</span>
                <span className="text-xs font-medium">${(item.amount / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Terminal */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Revenue por Terminal</h3>
          <div className="space-y-4">
            {revenue.byTerminal.map((item, index) => {
              const percentage = (item.amount / revenue.total) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm font-semibold">${item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Route */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Revenue por Ruta</h3>
          <div className="space-y-4">
            {revenue.byRoute.map((item, index) => {
              const percentage = (item.amount / revenue.total) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm font-semibold">${item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Revenue por Método de Pago</h3>
          <div className="space-y-4">
            {revenue.byMethod.map((item, index) => {
              const percentage = (item.amount / revenue.total) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.method}</span>
                    <span className="text-sm font-semibold">${item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end gap-4">
        <button className="px-6 py-3 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all hover-lift">
          Exportar Reporte PDF
        </button>
        <button className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-all">
          Exportar Excel
        </button>
      </div>
    </div>
  );
}

