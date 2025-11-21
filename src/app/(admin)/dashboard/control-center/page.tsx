"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FileText,
  MapPin,
  DollarSign,
  Printer,
  Receipt,
  Timer,
  Monitor,
  Database,
  Shield,
  Search,
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: string;
  badge?: string;
  color: string;
}

export default function ControlCenterPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/public/users/me");
      const data = await response.json();
      if (response.ok && data.user) {
        setUserRole(data.user.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const modules: Module[] = [
    // Dashboard & Analytics
    {
      id: "dashboard",
      title: "Dashboard Principal",
      description: "Vista general del sistema con estadísticas y métricas clave",
      icon: <LayoutDashboard className="w-6 h-6" />,
      href: "/dashboard",
      category: "Dashboard",
      color: "bg-blue-500",
    },
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
  ];

  const categories = Array.from(new Set(modules.map((m) => m.category)));

  const filteredModules = modules.filter((module) => {
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

  if (userRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
          <p className="text-muted-foreground">
            Solo los administradores pueden acceder a esta sección
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Centro de Control</h1>
              <p className="text-muted-foreground text-lg">
                Acceso completo a todas las funcionalidades del sistema
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              Volver al Dashboard
            </Link>
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
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded" />
                  {category}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({categoryModules.length})
                  </span>
                </h2>

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
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {module.title}
                            </h3>
                            {module.badge && (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                {module.badge}
                              </span>
                            )}
                          </div>
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

        {/* Stats Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{modules.length}</div>
              <div className="text-sm text-muted-foreground">Módulos Disponibles</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categorías</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {modules.filter((m) => m.category === "Operaciones").length}
              </div>
              <div className="text-sm text-muted-foreground">Módulos Operativos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {modules.filter((m) => m.category === "Configuración").length}
              </div>
              <div className="text-sm text-muted-foreground">Ajustes del Sistema</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

