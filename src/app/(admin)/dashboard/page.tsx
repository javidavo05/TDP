"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardTabs, type TabId } from "@/components/admin/DashboardTabs";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { SalesDashboard } from "@/components/admin/SalesDashboard";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import Link from "next/link";
import {
  LayoutDashboard,
  Bus,
  Route,
  Clock,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  QrCode,
  UserCheck,
  Calendar,
  Terminal,
  Receipt,
  Timer,
    Monitor,
    Printer,
    Search,
    Image as ImageIcon,
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: string;
  color: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [userRole, setUserRole] = useState<"admin" | "bus_owner" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalTickets: 0,
    totalRevenue: 0,
    activeBuses: 0,
  });

  useEffect(() => {
    fetchUserRole();
    fetchStats();
  }, []);

  // Redirect to routes page when routes tab is selected
  useEffect(() => {
    if (activeTab === "rutas") {
      router.push("/dashboard/routes");
    }
  }, [activeTab, router]);

  // Redirect to buses page when flota tab is selected
  useEffect(() => {
    if (activeTab === "flota") {
      router.push("/dashboard/buses");
    }
  }, [activeTab, router]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/public/users/me");
      const data = await response.json();
      if (response.ok && data.user) {
        setUserRole(data.user.role as "admin" | "bus_owner");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch trips
      const tripsResponse = await fetch("/api/admin/trips");
      const tripsData = await tripsResponse.json();
      const totalTrips = tripsData.trips?.length || 0;

      // Fetch buses
      const busesResponse = await fetch("/api/admin/buses");
      const busesData = await busesResponse.json();
      const activeBuses = (busesData.buses || []).filter((b: any) => b.isActive).length;

      // Fetch revenue (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const revenueResponse = await fetch(
        `/api/admin/analytics/revenue?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const revenueData = await revenueResponse.json();
      const totalRevenue = revenueData.revenue?.totalRevenue || 0;
      const totalTickets = revenueData.revenue?.totalTickets || 0;

      setStats({
        totalTrips,
        totalTickets,
        totalRevenue,
        activeBuses,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const controlCenterModules: Module[] = [
    // Dashboard & Analytics
    {
      id: "analytics",
      title: "Analytics & Reportes",
      description: "Análisis financiero, reportes de ventas y métricas de negocio",
      icon: <BarChart3 className="w-6 h-6" />,
      href: "/dashboard?tab=analytics",
      category: "Dashboard",
      color: "bg-purple-500",
    },
    {
      id: "ventas",
      title: "Panel de Ventas",
      description: "Gestión de ventas, tickets y transacciones",
      icon: <ShoppingCart className="w-6 h-6" />,
      href: "/dashboard?tab=ventas",
      category: "Dashboard",
      color: "bg-green-500",
    },

    // Flota & Vehículos
    {
      id: "buses",
      title: "Gestión de Flota",
      description: "Administrar buses, unidades, capacidad y mantenimiento",
      icon: <Bus className="w-6 h-6" />,
      href: "/dashboard/buses",
      category: "Flota",
      color: "bg-indigo-500",
    },
    {
      id: "buses-new",
      title: "Nuevo Bus",
      description: "Registrar una nueva unidad en la flota",
      icon: <Bus className="w-6 h-6" />,
      href: "/dashboard/buses/new",
      category: "Flota",
      color: "bg-indigo-400",
    },

    // Rutas & Horarios
    {
      id: "routes",
      title: "Gestión de Rutas",
      description: "Crear y administrar rutas, paradas y precios",
      icon: <Route className="w-6 h-6" />,
      href: "/dashboard/routes",
      category: "Rutas",
      color: "bg-orange-500",
    },
    {
      id: "routes-new",
      title: "Nueva Ruta",
      description: "Crear una nueva ruta con paradas y precios",
      icon: <Route className="w-6 h-6" />,
      href: "/dashboard/routes/new",
      category: "Rutas",
      color: "bg-orange-400",
    },
    {
      id: "schedules",
      title: "Asignación de Horarios",
      description: "Roster de buses, asignación de horarios y generación de viajes",
      icon: <Clock className="w-6 h-6" />,
      href: "/dashboard/schedules",
      category: "Rutas",
      color: "bg-yellow-500",
    },

    // Terminales & POS
    {
      id: "pos-terminals",
      title: "Terminales POS",
      description: "Gestionar terminales de punto de venta y cajas registradoras",
      icon: <Terminal className="w-6 h-6" />,
      href: "/dashboard/pos/terminals",
      category: "POS",
      color: "bg-cyan-500",
    },
    {
      id: "pos-terminal-new",
      title: "Nuevo Terminal POS",
      description: "Registrar un nuevo terminal de punto de venta",
      icon: <Terminal className="w-6 h-6" />,
      href: "/dashboard/pos/terminals/new",
      category: "POS",
      color: "bg-cyan-400",
    },
    {
      id: "pos",
      title: "Punto de Venta",
      description: "Interfaz de venta de boletos para terminales POS",
      icon: <ShoppingCart className="w-6 h-6" />,
      href: "/dashboard/pos",
      category: "POS",
      color: "bg-teal-500",
    },

    // Usuarios & Permisos
    {
      id: "users",
      title: "Gestión de Usuarios",
      description: "Administrar usuarios, roles y permisos del sistema",
      icon: <Users className="w-6 h-6" />,
      href: "/dashboard/users",
      category: "Usuarios",
      color: "bg-pink-500",
    },
    {
      id: "passengers",
      title: "Base de Pasajeros",
      description: "Gestionar pasajeros, historial de viajes y perfiles",
      icon: <UserCheck className="w-6 h-6" />,
      href: "/dashboard/passengers",
      category: "Usuarios",
      color: "bg-rose-500",
    },

    // Operaciones
    {
      id: "scanner",
      title: "Scanner QR",
      description: "Validar tickets QR en tiempo real",
      icon: <QrCode className="w-6 h-6" />,
      href: "/dashboard/scanner",
      category: "Operaciones",
      color: "bg-emerald-500",
    },
    {
      id: "trips",
      title: "Gestión de Viajes",
      description: "Ver y administrar viajes programados y en curso",
      icon: <Calendar className="w-6 h-6" />,
      href: "/dashboard/trips",
      category: "Operaciones",
      color: "bg-lime-500",
    },
    {
      id: "departures",
      title: "Pantallas de Salidas",
      description: "Vista pública de salidas estilo aeropuerto",
      icon: <Monitor className="w-6 h-6" />,
      href: "/departures",
      category: "Operaciones",
      color: "bg-slate-500",
    },

    // Configuración
    {
      id: "settings",
      title: "Configuración General",
      description: "Ajustes del sistema, pasarelas de pago y notificaciones",
      icon: <Settings className="w-6 h-6" />,
      href: "/dashboard?tab=configuracion",
      category: "Configuración",
      color: "bg-gray-500",
    },
    {
      id: "driver-hours",
      title: "Horas de Conducción",
      description: "Configurar límites de horas de manejo para choferes",
      icon: <Timer className="w-6 h-6" />,
      href: "/dashboard/settings/driver-hours",
      category: "Configuración",
      color: "bg-amber-500",
    },
    {
      id: "fiscal",
      title: "Configuración Fiscal",
      description: "Ajustes fiscales, impuestos y reportes contables",
      icon: <Receipt className="w-6 h-6" />,
      href: "/dashboard/settings/fiscal",
      category: "Configuración",
      color: "bg-red-500",
    },
    {
      id: "printer",
      title: "Impresoras",
      description: "Configurar impresoras térmicas y dispositivos de impresión",
      icon: <Printer className="w-6 h-6" />,
      href: "/dashboard/settings/printer",
      category: "Configuración",
      color: "bg-zinc-500",
    },
    {
      id: "advertising",
      title: "Gestión de Publicidad",
      description: "Gestionar imágenes y videos para pantallas de publicidad",
      icon: <ImageIcon className="w-6 h-6" />,
      href: "/dashboard/advertising",
      category: "Configuración",
      color: "bg-violet-500",
    },
  ];

  const categories = Array.from(new Set(controlCenterModules.map((m) => m.category)));

  const filteredModules = controlCenterModules.filter((module) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        module.title.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query) ||
        module.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const groupedModules = categories.reduce((acc, category) => {
    acc[category] = filteredModules.filter((m) => m.category === category);
    return acc;
  }, {} as Record<string, Module[]>);

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {userRole === "bus_owner" ? "Mi Flota" : "Vista General"}
              </h2>
              <p className="text-muted-foreground">
                {userRole === "bus_owner"
                  ? "Resumen de tu flota y operaciones"
                  : "Resumen del sistema"}
              </p>
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

            {/* Centro de Control - Solo para Super Admin */}
            {userRole === "admin" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Centro de Control</h2>
                    <p className="text-muted-foreground">
                      Acceso completo a todas las funcionalidades del sistema
                    </p>
                  </div>
                  {/* Search Bar */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar funcionalidad..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Modules Grid by Category */}
                <div className="space-y-8">
                  {categories.map((category) => {
                    const categoryModules = groupedModules[category];
                    if (categoryModules.length === 0) return null;

                    return (
                      <div key={category} className="space-y-4">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <div className="w-1 h-6 bg-primary rounded" />
                          {category}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({categoryModules.length})
                          </span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {categoryModules.map((module) => (
                            <Link
                              key={module.id}
                              href={module.href}
                              className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all duration-200 hover-lift"
                            >
                              <div className="flex items-start gap-4">
                                <div
                                  className={`${module.color} text-white p-3 rounded-lg group-hover:scale-110 transition-transform`}
                                >
                                  {module.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base group-hover:text-primary transition-colors mb-1">
                                    {module.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {module.description}
                                  </p>
                                </div>
                              </div>
                              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg
                                  className="w-5 h-5 text-primary"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Accesos Rápidos para otros roles */
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
                    {userRole === "bus_owner" && (
                      <Link
                        href="/dashboard/owner/calendar"
                        className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all"
                      >
                        <div className="font-medium mb-1">Calendario de Unidades</div>
                        <div className="text-sm text-muted-foreground">Ver historial completo</div>
                      </Link>
                    )}
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
            )}
          </div>
        );
      case "ventas":
        return <SalesDashboard />;
      case "flota":
        // This case should not be reached as we redirect immediately
        // But keep it as fallback
        return null;
      case "rutas":
        // This case should not be reached as we redirect immediately
        // But keep it as fallback
        return null;
      case "terminales":
        return (
          <div className="animate-fadeIn">
            <h2 className="text-3xl font-bold mb-2">Gestión de Terminales</h2>
            <p className="text-muted-foreground mb-6">Administra los terminales POS</p>
            <Link href="/dashboard/pos/terminals" className="inline-flex items-center gap-2 text-primary hover:text-primary-dark">
              Ver gestión completa de terminales →
            </Link>
          </div>
        );
      case "usuarios":
        router.push("/dashboard/users");
        return null;
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

