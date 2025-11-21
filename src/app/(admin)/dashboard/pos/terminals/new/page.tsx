"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPOSTerminalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    terminalIdentifier: "",
    physicalLocation: "",
    locationCode: "",
    assignedUserId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/pos/terminals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminalIdentifier: formData.terminalIdentifier,
          physicalLocation: formData.physicalLocation,
          locationCode: formData.locationCode || undefined,
          assignedUserId: formData.assignedUserId || undefined,
        }),
      });

      if (response.ok) {
        router.push("/dashboard/pos/terminals");
      } else {
        const error = await response.json();
        alert(error.error || "Error al crear terminal");
      }
    } catch (error) {
      console.error("Error creating terminal:", error);
      alert("Error al crear terminal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Link href="/dashboard/pos/terminals">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Terminal POS</CardTitle>
          <CardDescription>
            Crea una nueva terminal de punto de venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="terminalIdentifier">Identificador de Terminal *</Label>
              <Input
                id="terminalIdentifier"
                value={formData.terminalIdentifier}
                onChange={(e) =>
                  setFormData({ ...formData, terminalIdentifier: e.target.value })
                }
                required
                placeholder="Ej: TERMINAL-001"
              />
            </div>

            <div>
              <Label htmlFor="physicalLocation">Ubicación Física *</Label>
              <Textarea
                id="physicalLocation"
                value={formData.physicalLocation}
                onChange={(e) =>
                  setFormData({ ...formData, physicalLocation: e.target.value })
                }
                required
                placeholder="Ej: Terminal David - Calle Principal, Edificio Central"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="locationCode">Código de Ubicación</Label>
              <Input
                id="locationCode"
                value={formData.locationCode}
                onChange={(e) =>
                  setFormData({ ...formData, locationCode: e.target.value })
                }
                placeholder="Ej: DAV-001"
              />
            </div>

            <div>
              <Label htmlFor="assignedUserId">ID de Usuario Asignado (Opcional)</Label>
              <Input
                id="assignedUserId"
                type="text"
                value={formData.assignedUserId}
                onChange={(e) =>
                  setFormData({ ...formData, assignedUserId: e.target.value })
                }
                placeholder="UUID del usuario POS"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puedes asignar un usuario después de crear la terminal
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Terminal"}
              </Button>
              <Link href="/dashboard/pos/terminals">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

