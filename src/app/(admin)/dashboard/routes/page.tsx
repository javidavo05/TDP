"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number | null;
  estimatedDurationMinutes: number | null;
  basePrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchRoutes();
  }, [page]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/routes?page=${page}&limit=${limit}`);
      const data = await response.json();

      if (response.ok) {
        setRoutes(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta ruta?")) return;

    try {
      const response = await fetch(`/api/admin/routes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchRoutes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Error al eliminar la ruta"}`);
      }
    } catch (error) {
      console.error("Error deleting route:", error);
      alert("Error al eliminar la ruta");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Rutas</h1>
            <p className="text-muted-foreground">Administra las rutas de transporte</p>
          </div>
          <Link
            href="/dashboard/routes/new"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors font-semibold"
          >
            + Nueva Ruta
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-muted-foreground">Cargando...</div>
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-muted-foreground mb-4">No hay rutas registradas</div>
            <Link
              href="/dashboard/routes/new"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors"
            >
              Crear Primera Ruta
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ruta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Distancia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Duración
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Precio Base
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {routes.map((route) => (
                      <tr key={route.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold">{route.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {route.origin} → {route.destination}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {route.distanceKm ? `${route.distanceKm} km` : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {route.estimatedDurationMinutes
                            ? `${Math.floor(route.estimatedDurationMinutes / 60)}h ${route.estimatedDurationMinutes % 60}m`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-primary">${route.basePrice.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              route.isActive
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {route.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/routes/${route.id}`}
                              className="text-primary hover:text-primary-dark font-medium"
                            >
                              Editar
                            </Link>
                            <button
                              onClick={() => handleDelete(route.id)}
                              className="text-destructive hover:text-destructive/80 font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= total}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
