"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TouchButton } from "@/components/pos/TouchButton";

export default function FiscalSettingsPage() {
  const [printerType, setPrinterType] = useState<"epson" | "star" | "none">("none");
  const [portPath, setPortPath] = useState("");
  const [status, setStatus] = useState<{ online: boolean; paperStatus: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load saved settings
    // TODO: Load from API
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // TODO: Call API to test fiscal printer connection
      const response = await fetch("/api/admin/settings/fiscal/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerType, portPath }),
      });

      const data = await response.json();
      if (response.ok) {
        setStatus(data.status);
        alert("Conexión exitosa");
      } else {
        alert(`Error: ${data.error || "Error al conectar"}`);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      alert("Error al probar la conexión");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/admin/settings/fiscal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerType, portPath }),
      });

      if (response.ok) {
        alert("Configuración guardada exitosamente");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Error al guardar"}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error al guardar la configuración");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard/settings"
            className="text-primary hover:text-primary-dark mb-2 inline-block"
          >
            ← Volver a Configuración
          </Link>
          <h1 className="text-3xl font-bold mb-2">Configuración Fiscal</h1>
          <p className="text-muted-foreground">Configura la impresora fiscal</p>
        </div>

        <div className="max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-6">
            <div>
              <label className="block text-lg font-semibold mb-3">
                Tipo de Impresora Fiscal
              </label>
              <select
                value={printerType}
                onChange={(e) => setPrinterType(e.target.value as "epson" | "star" | "none")}
                className="w-full px-6 py-4 bg-background border-2 border-input rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
              >
                <option value="none">Seleccionar...</option>
                <option value="epson">Epson</option>
                <option value="star">Star Micronics</option>
              </select>
            </div>

            {printerType !== "none" && (
              <>
                <div>
                  <label className="block text-lg font-semibold mb-3">
                    Puerto / Ruta de Conexión
                  </label>
                  <input
                    type="text"
                    value={portPath}
                    onChange={(e) => setPortPath(e.target.value)}
                    placeholder="Ej: COM3 (Windows) o /dev/ttyUSB0 (Linux)"
                    className="w-full px-6 py-4 bg-background border-2 border-input rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                  />
                </div>

                {status && (
                  <div className={`p-4 rounded-xl ${status.online ? "bg-success/10 border border-success" : "bg-destructive/10 border border-destructive"}`}>
                    <div className="font-semibold mb-2">
                      Estado: {status.online ? "Conectado" : "Desconectado"}
                    </div>
                    <div className="text-sm">
                      Papel: {status.paperStatus}
                    </div>
                    {status.error && (
                      <div className="text-sm text-destructive mt-2">
                        Error: {status.error}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <TouchButton
                    onClick={handleTestConnection}
                    disabled={testing || !portPath}
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                  >
                    {testing ? "Probando..." : "Probar Conexión"}
                  </TouchButton>
                  <TouchButton
                    onClick={handleSave}
                    disabled={!portPath || printerType === "none"}
                    variant="primary"
                    size="lg"
                    className="flex-1"
                  >
                    Guardar
                  </TouchButton>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

