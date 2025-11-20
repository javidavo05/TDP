"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface Passenger {
  id: string;
  documentId: string;
  documentType: "cedula" | "pasaporte";
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchPassengers();
  }, [page, searchQuery]);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/admin/passengers?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${limit}`
        : `/api/admin/passengers?page=${page}&limit=${limit}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setPassengers(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching passengers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Base de Datos de Clientes</h1>
            <p className="text-muted-foreground">Gestiona todos los pasajeros registrados</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre, documento, teléfono o email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full max-w-md px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Passengers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-muted-foreground">Cargando...</div>
          </div>
        ) : passengers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-muted-foreground">
              {searchQuery ? "No se encontraron pasajeros" : "No hay pasajeros registrados"}
            </div>
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
                        Documento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Registrado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {passengers.map((passenger) => (
                      <tr key={passenger.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold">{passenger.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <span className="capitalize">{passenger.documentType}</span>
                            <span className="text-muted-foreground ml-2">{passenger.documentId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {passenger.phone && <div>{passenger.phone}</div>}
                            {passenger.email && (
                              <div className="text-muted-foreground">{passenger.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(passenger.createdAt), "dd/MM/yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/passengers/${passenger.id}`}
                            className="text-primary hover:text-primary-dark font-medium"
                          >
                            Ver Perfil →
                          </Link>
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

