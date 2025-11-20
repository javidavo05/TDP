"use client";

import { useState, useEffect } from "react";
import { DashboardTabs, type TabId } from "@/components/admin/DashboardTabs";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { SalesDashboard } from "@/components/admin/SalesDashboard";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalTickets: 0,
    totalRevenue: 0,
    activeBuses: 0,
  });

  useEffect(() => {
    // Fetch stats from API
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // TODO: Fetch from API
    setStats({
      totalTrips: 150,
      totalTickets: 1250,
      totalRevenue: 125000,
      activeBuses: 25,
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-bold mb-2">Vista General</h2>
              <p className="text-muted-foreground">Resumen del sistema</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Viajes</h3>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-4xl font-bold mb-2">{stats.totalTrips}</p>
                <p className="text-sm text-success">+12 este mes</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Tickets</h3>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold mb-2">{stats.totalTickets.toLocaleString()}</p>
                <p className="text-sm text-success">+8.2% este mes</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Revenue Total</h3>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold mb-2">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-success">+12.5% este mes</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Buses Activos</h3>
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-4xl font-bold mb-2">{stats.activeBuses}</p>
                <p className="text-sm text-success">Todos operativos</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/dashboard/buses"
                    className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                  >
                    <div className="font-medium mb-1">Gestión de Buses</div>
                    <div className="text-sm text-muted-foreground">Administrar flota</div>
                  </Link>
                  <Link
                    href="/dashboard/routes"
                    className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                  >
                    <div className="font-medium mb-1">Gestión de Rutas</div>
                    <div className="text-sm text-muted-foreground">Configurar rutas</div>
                  </Link>
                  <Link
                    href="/dashboard/trips"
                    className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                  >
                    <div className="font-medium mb-1">Gestión de Viajes</div>
                    <div className="text-sm text-muted-foreground">Programar viajes</div>
                  </Link>
                  <Link
                    href="/dashboard/pos"
                    className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                  >
                    <div className="font-medium mb-1">Terminales POS</div>
                    <div className="text-sm text-muted-foreground">Configurar POS</div>
                  </Link>
                  <Link
                    href="/dashboard/scanner"
                    className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                  >
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Scanner QR
                    </div>
                    <div className="text-sm text-muted-foreground">Validar tickets</div>
                  </Link>
                  <Link
                    href="/dashboard/passengers"
                    className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                  >
                    <div className="flex items-center gap-2 font-medium mb-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Base de Clientes
                    </div>
                    <div className="text-sm text-muted-foreground">Gestionar pasajeros</div>
                  </Link>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Actividad Reciente</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Nuevo ticket vendido</div>
                      <div className="text-xs text-muted-foreground">Hace 5 minutos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Viaje completado</div>
                      <div className="text-xs text-muted-foreground">Hace 15 minutos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-warning rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Bus en mantenimiento</div>
                      <div className="text-xs text-muted-foreground">Hace 1 hora</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "ventas":
        return <SalesDashboard />;
      case "flota":
        return (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold mb-2">Gestión de Flota</h2>
            <p className="text-muted-foreground mb-6">Administra tus buses y vehículos</p>
            <Link href="/dashboard/buses" className="inline-flex items-center gap-2 text-primary hover:text-primary-dark">
              Ver gestión completa de buses →
            </Link>
          </div>
        );
      case "rutas":
        return (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold mb-2">Gestión de Rutas</h2>
            <p className="text-muted-foreground mb-6">Configura y administra las rutas</p>
            <Link href="/dashboard/routes" className="inline-flex items-center gap-2 text-primary hover:text-primary-dark">
              Ver gestión completa de rutas →
            </Link>
          </div>
        );
      case "terminales":
        return (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold mb-2">Gestión de Terminales</h2>
            <p className="text-muted-foreground mb-6">Administra los terminales POS</p>
            <Link href="/dashboard/pos" className="inline-flex items-center gap-2 text-primary hover:text-primary-dark">
              Ver gestión completa de terminales →
            </Link>
          </div>
        );
      case "usuarios":
        return (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold mb-2">Gestión de Usuarios</h2>
            <p className="text-muted-foreground mb-6">Administra usuarios y roles</p>
            <p className="text-muted-foreground">Funcionalidad en desarrollo...</p>
          </div>
        );
      case "analytics":
        return <FinancialDashboard />;
      case "configuracion":
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="container mx-auto px-4 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}

