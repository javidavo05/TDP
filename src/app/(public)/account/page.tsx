"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      // This would fetch from an API endpoint
      setUser({ email: "user@example.com", fullName: "Usuario" });
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Mi Cuenta</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    defaultValue={user?.fullName}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="w-full p-2 border rounded"
                    disabled
                  />
                </div>
                <button className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
              <div className="space-y-2">
                <Link
                  href="/tickets"
                  className="block p-3 border rounded hover:bg-muted transition"
                >
                  Mis Tickets
                </Link>
                <Link
                  href="/search"
                  className="block p-3 border rounded hover:bg-muted transition"
                >
                  Buscar Viajes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

