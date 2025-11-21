"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, User, Calendar, DollarSign } from "lucide-react";

interface POSTerminal {
  id: string;
  terminalIdentifier: string;
  physicalLocation: string;
  locationCode: string | null;
  assignedUserId: string | null;
  isOpen: boolean;
  isActive: boolean;
  lastOpenedAt: string | null;
  lastClosedAt: string | null;
  initialCashAmount: number;
  currentCashAmount: number;
}

interface Session {
  id: string;
  openedAt: string;
  closedAt: string | null;
  totalSales: number;
  totalTickets: number;
  closureType: "X" | "Z" | null;
}

export default function POSTerminalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [terminal, setTerminal] = useState<POSTerminal | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchTerminal();
      fetchSessions();
    }
  }, [params.id]);

  const fetchTerminal = async () => {
    try {
      const response = await fetch(`/api/admin/pos/terminals/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTerminal(data.terminal);
      }
    } catch (error) {
      console.error("Error fetching terminal:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      // This would need a new API endpoint for sessions by terminal
      // For now, we'll just show the terminal info
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Terminal no encontrada</p>
          <Link href="/dashboard/pos/terminals">
            <Button variant="outline" className="mt-4">
              Volver
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard/pos/terminals">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <Link href={`/pos/${terminal.id}`}>
          <Button>
            Abrir Terminal POS
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{terminal.terminalIdentifier}</CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {terminal.physicalLocation}
                </div>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {terminal.isOpen ? (
                <Badge variant="default" className="bg-green-500">
                  Abierta
                </Badge>
              ) : (
                <Badge variant="secondary">Cerrada</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Código de Ubicación</div>
              <div className="font-medium">{terminal.locationCode || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Estado</div>
              <div className="font-medium">
                {terminal.isActive ? "Activa" : "Inactiva"}
              </div>
            </div>
            {terminal.isOpen && (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Efectivo Actual</div>
                  <div className="font-medium text-green-600">
                    ${terminal.currentCashAmount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Última Apertura</div>
                  <div className="font-medium">
                    {terminal.lastOpenedAt
                      ? new Date(terminal.lastOpenedAt).toLocaleString()
                      : "N/A"}
                  </div>
                </div>
              </>
            )}
          </div>

          {terminal.lastClosedAt && (
            <div>
              <div className="text-sm text-muted-foreground">Último Cierre</div>
              <div className="font-medium">
                {new Date(terminal.lastClosedAt).toLocaleString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Sesiones</CardTitle>
          <CardDescription>Registro de aperturas y cierres de caja</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay sesiones registradas
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {new Date(session.openedAt).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.totalTickets} tickets - ${session.totalSales.toFixed(2)}
                    </div>
                  </div>
                  {session.closureType && (
                    <Badge variant="outline">Cierre {session.closureType}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

