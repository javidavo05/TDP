"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";

interface DriverHoursConfig {
  id: string;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  maxHoursPerMonth: number;
  restHoursRequired: number;
}

export default function DriverHoursConfigPage() {
  const [config, setConfig] = useState<DriverHoursConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/driver-hours?action=config");
      const data = await response.json();
      
      if (response.ok) {
        setConfig(data.config);
      } else {
        setError(data.error || "Error al cargar configuración");
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      setError("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/admin/driver-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateConfig",
          config,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConfig(data.config);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Error al guardar configuración");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      setError("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-destructive">Error al cargar configuración</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Configuración de Horas de Conducción</h1>
            <p className="text-muted-foreground mt-2">
              Establece los límites de horas de trabajo para los choferes
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-500">
            Configuración guardada exitosamente
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg max-w-2xl">
          <h2 className="text-2xl font-semibold mb-6">Límites de Horas</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Máximo de Horas por Día
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={config.maxHoursPerDay}
                onChange={(e) =>
                  setConfig({ ...config, maxHoursPerDay: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de horas que un chofer puede trabajar en un día
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Máximo de Horas por Semana
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="168"
                value={config.maxHoursPerWeek}
                onChange={(e) =>
                  setConfig({ ...config, maxHoursPerWeek: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de horas que un chofer puede trabajar en una semana
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Máximo de Horas por Mes
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={config.maxHoursPerMonth}
                onChange={(e) =>
                  setConfig({ ...config, maxHoursPerMonth: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de horas que un chofer puede trabajar en un mes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Horas de Descanso Requeridas
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={config.restHoursRequired}
                onChange={(e) =>
                  setConfig({ ...config, restHoursRequired: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número mínimo de horas de descanso requeridas entre turnos
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

