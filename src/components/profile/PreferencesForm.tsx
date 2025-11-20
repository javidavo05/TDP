"use client";

import { useState } from "react";

interface PreferencesFormProps {
  preferences?: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
    };
    seatPreference?: string;
    paymentMethod?: string;
    language?: string;
  };
  onSave: (preferences: any) => Promise<void>;
}

export function PreferencesForm({ preferences, onSave }: PreferencesFormProps) {
  const [formData, setFormData] = useState({
    emailNotifications: preferences?.notifications?.email ?? true,
    smsNotifications: preferences?.notifications?.sms ?? false,
    seatPreference: preferences?.seatPreference || "none",
    paymentMethod: preferences?.paymentMethod || "yappy",
    language: preferences?.language || "es",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        notifications: {
          email: formData.emailNotifications,
          sms: formData.smsNotifications,
        },
        seatPreference: formData.seatPreference,
        paymentMethod: formData.paymentMethod,
        language: formData.language,
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Notificaciones</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.emailNotifications}
              onChange={(e) =>
                setFormData({ ...formData, emailNotifications: e.target.checked })
              }
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <span>Recibir notificaciones por email</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.smsNotifications}
              onChange={(e) =>
                setFormData({ ...formData, smsNotifications: e.target.checked })
              }
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <span>Recibir notificaciones por SMS</span>
          </label>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Preferencias de Viaje</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Preferencia de Asiento</label>
            <select
              value={formData.seatPreference}
              onChange={(e) =>
                setFormData({ ...formData, seatPreference: e.target.value })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="none">Sin preferencia</option>
              <option value="window">Ventana</option>
              <option value="aisle">Pasillo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Método de Pago Preferido</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
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
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Configuración</h3>
        <div>
          <label className="block text-sm font-medium mb-2">Idioma</label>
          <select
            value={formData.language}
            onChange={(e) =>
              setFormData({ ...formData, language: e.target.value })
            }
            className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Guardando..." : "Guardar Preferencias"}
      </button>
    </form>
  );
}

