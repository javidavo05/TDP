"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { TicketCard } from "@/components/profile/TicketCard";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    seatPreference: "none",
    paymentMethod: "yappy",
    language: "es",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || "",
        phone: user.phone || "",
        address: "",
        dateOfBirth: "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "tickets" || activeTab === "history") {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const response = await fetch("/api/public/tickets");
      if (response.ok) {
        const data = await response.json();
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to update profile
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Perfil actualizado exitosamente");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to update preferences
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Preferencias guardadas exitosamente");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Error al guardar las preferencias");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 animate-fadeInDown">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Mi Perfil
          </h1>
          <p className="text-xl text-muted-foreground">
            Gestiona tu información personal, tickets y preferencias
          </p>
        </div>

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="animate-fadeInUp">
          {activeTab === "profile" && (
            <div className="bg-card border border-border rounded-xl p-8 shadow-premium">
              <h2 className="text-2xl font-semibold mb-6">Información Personal</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-2 bg-muted border border-input rounded-lg text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El email no puede ser modificado
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+507 6000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dirección</label>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Dirección completa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "tickets" && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Mis Tickets</h2>
                <select className="px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="all">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="paid">Pagados</option>
                  <option value="boarded">Abordados</option>
                  <option value="completed">Completados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              {ticketsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Cargando tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center shadow-premium">
                  <div className="text-6xl mb-4">🎫</div>
                  <h3 className="text-xl font-semibold mb-2">No tienes tickets aún</h3>
                  <p className="text-muted-foreground mb-6">
                    Comienza a viajar comprando tu primer boleto
                  </p>
                  <a
                    href="/search"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                  >
                    Buscar Viajes
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">Historial de Viajes</h2>
              <div className="bg-card border border-border rounded-xl p-8 shadow-premium">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total de Viajes</p>
                    <p className="text-3xl font-bold">{tickets.filter((t) => t.status === "completed").length}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Gasto Total</p>
                    <p className="text-3xl font-bold text-primary">
                      ${tickets.reduce((sum, t) => sum + (t.totalPrice || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Destinos Visitados</p>
                    <p className="text-3xl font-bold">
                      {new Set(tickets.map((t) => t.trip?.destination).filter(Boolean)).size}
                    </p>
                  </div>
                </div>

                {ticketsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Cargando historial...</p>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No hay historial de viajes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets
                      .filter((t) => ["completed", "boarded"].includes(t.status))
                      .map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">
                                {ticket.trip?.origin || "Origen"} → {ticket.trip?.destination || "Destino"}
                              </p>
                              {ticket.trip?.departureTime && (
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(ticket.trip.departureTime), "d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">${ticket.totalPrice?.toFixed(2) || "0.00"}</p>
                              {ticket.seat?.number && (
                                <p className="text-xs text-muted-foreground">Asiento {ticket.seat.number}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="bg-card border border-border rounded-xl p-8 shadow-premium">
              <h2 className="text-2xl font-semibold mb-6">Preferencias</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notificaciones</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={(e) =>
                          setPreferences({ ...preferences, emailNotifications: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                      <span>Recibir notificaciones por email</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.smsNotifications}
                        onChange={(e) =>
                          setPreferences({ ...preferences, smsNotifications: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                      />
                      <span>Recibir notificaciones por SMS</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Preferencia de Asiento</h3>
                  <div className="space-y-2">
                    {[
                      { value: "none", label: "Sin preferencia" },
                      { value: "window", label: "Ventana" },
                      { value: "aisle", label: "Pasillo" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="seatPreference"
                          value={option.value}
                          checked={preferences.seatPreference === option.value}
                          onChange={(e) =>
                            setPreferences({ ...preferences, seatPreference: e.target.value })
                          }
                          className="w-5 h-5 border-input text-primary focus:ring-2 focus:ring-primary"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Método de Pago Preferido</h3>
                  <select
                    value={preferences.paymentMethod}
                    onChange={(e) =>
                      setPreferences({ ...preferences, paymentMethod: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="yappy">Yappy</option>
                    <option value="paguelofacil">PagueloFacil</option>
                    <option value="tilopay">Tilopay</option>
                    <option value="payu">PayU</option>
                    <option value="banesco">Banesco</option>
                    <option value="cash">Efectivo</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Idioma</h3>
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar Preferencias"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
