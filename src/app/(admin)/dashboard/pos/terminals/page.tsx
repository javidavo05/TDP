"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, User, Lock, Unlock } from "lucide-react";

interface POSTerminal {
  id: string;
  terminalIdentifier: string;
  physicalLocation: string;
  locationCode: string | null;
  assignedUserId: string | null;
  assignedUserName?: string;
  isOpen: boolean;
  isActive: boolean;
  lastOpenedAt: string | null;
  lastClosedAt: string | null;
}

export default function POSTerminalsPage() {
  const [terminals, setTerminals] = useState<POSTerminal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    try {
      const response = await fetch("/api/admin/pos/terminals");
      if (response.ok) {
        const data = await response.json();
        setTerminals(data.terminals || data.data || []);
      }
    } catch (error) {
      console.error("Error fetching terminals:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando terminales...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Terminales POS</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las terminales de punto de venta
          </p>
        </div>
        <Link href="/dashboard/pos/terminals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Terminal
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {terminals.map((terminal) => (
          <Card key={terminal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{terminal.terminalIdentifier}</CardTitle>
                <div className="flex gap-2">
                  {terminal.isOpen ? (
                    <Badge variant="default" className="bg-green-500">
                      <Unlock className="mr-1 h-3 w-3" />
                      Abierta
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Lock className="mr-1 h-3 w-3" />
                      Cerrada
                    </Badge>
                  )}
                  {!terminal.isActive && (
                    <Badge variant="outline">Inactiva</Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4" />
                  {terminal.physicalLocation}
                </div>
                {terminal.locationCode && (
                  <div className="text-xs mt-1">Código: {terminal.locationCode}</div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {terminal.assignedUserName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{terminal.assignedUserName}</span>
                  </div>
                )}
                {terminal.lastOpenedAt && (
                  <div className="text-xs text-muted-foreground">
                    Última apertura: {new Date(terminal.lastOpenedAt).toLocaleString()}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Link href={`/pos/${terminal.id}`} className="flex-1">
                    <Button className="w-full">
                      Abrir Terminal
                    </Button>
                  </Link>
                  <Link href={`/dashboard/pos/terminals/${terminal.id}`}>
                    <Button variant="outline">
                      Detalles
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {terminals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No hay terminales registradas</p>
            <Link href="/dashboard/pos/terminals/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Terminal
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

