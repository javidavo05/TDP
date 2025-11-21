"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PWA_CONFIGS, type PWAType } from "@/config/pwa-icons";

interface PaymentGatewayConfig {
  enabled: boolean;
  merchant_id?: string;
  secret_key?: string;
  api_key?: string;
  api_login?: string;
  webhook_url?: string;
}

interface EmailConfig {
  enabled: boolean;
  api_key?: string;
  from_email?: string;
}

interface GeneralConfig {
  company_name: string;
  company_logo_url?: string;
  currency: string;
  itbms_rate: number;
  timezone: string;
  language: string;
}

interface PWAIconConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  text: string;
  iconPrefix: string;
}

interface PWAIconsConfig {
  public: PWAIconConfig;
  admin: PWAIconConfig;
  pos: PWAIconConfig;
  scanner: PWAIconConfig;
}

type SettingsTab = "payment" | "email" | "general" | "pwa_icons";

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("payment");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Payment gateways state
  const [paymentGateways, setPaymentGateways] = useState<Record<string, PaymentGatewayConfig>>({});
  const [activeGateway, setActiveGateway] = useState<string>("yappy");

  // Email state
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    enabled: false,
    api_key: "",
    from_email: "",
  });

  // General state
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>({
    company_name: "TDP Ticketing System",
    currency: "USD",
    itbms_rate: 0.07,
    timezone: "America/Panama",
    language: "es",
  });

  // PWA Icons state
  const [pwaIconsConfig, setPwaIconsConfig] = useState<PWAIconsConfig>(PWA_CONFIGS);
  const [generatingIcons, setGeneratingIcons] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      
      if (data.payment) setPaymentGateways(data.payment);
      if (data.email) setEmailConfig(data.email);
      if (data.general) setGeneralConfig(data.general);
      
      // Load PWA icons config separately
      const pwaIconsResponse = await fetch("/api/admin/settings?category=pwa_icons");
      if (pwaIconsResponse.ok) {
        const pwaIconsData = await pwaIconsResponse.json();
        if (pwaIconsData.pwa_icons) {
          setPwaIconsConfig(pwaIconsData.pwa_icons);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (gateway: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway,
          config: paymentGateways[gateway],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save payment gateway settings");
      }

      setSuccess(`Configuración de ${gateway} guardada exitosamente`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save email settings");
      }

      setSuccess("Configuración de email guardada exitosamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save general settings");
      }

      setSuccess("Configuración general guardada exitosamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePWAIcons = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "pwa_icons",
          data: pwaIconsConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save PWA icons configuration");
      }

      setSuccess("Configuración de iconos PWA guardada exitosamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateIcons = async () => {
    setGeneratingIcons(true);
    setError(null);
    setSuccess(null);
    try {
      // First save the configuration
      await handleSavePWAIcons();
      
      // Then generate icons
      const response = await fetch("/api/admin/settings/generate-icons", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate icons");
      }

      setSuccess("Iconos generados exitosamente. Recarga la página para ver los cambios.");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingIcons(false);
    }
  };

  const updatePWAIconConfig = (pwa: PWAType, field: keyof PWAIconConfig, value: string) => {
    setPwaIconsConfig((prev) => ({
      ...prev,
      [pwa]: {
        ...prev[pwa],
        [field]: value,
      },
    }));
  };

  const updatePaymentGateway = (gateway: string, field: string, value: any) => {
    setPaymentGateways((prev) => ({
      ...prev,
      [gateway]: {
        ...(prev[gateway] || { enabled: false }),
        [field]: value,
      },
    }));
  };

  const gatewayNames: Record<string, string> = {
    yappy: "Yappy Comercial",
    paguelofacil: "PagueloFacil",
    tilopay: "Tilopay",
    payu: "PayU",
    banesco: "Banesco Panamá",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Configuración del Sistema</h2>
        <p className="text-muted-foreground">Gestiona las configuraciones del sistema</p>
      </div>

      {/* Hardware Settings Links */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg mb-6">
        <h3 className="text-lg font-semibold mb-4">Configuración de Hardware</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/settings/printer"
            className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all flex items-center gap-3"
          >
            <span className="text-2xl">🖨️</span>
            <div>
              <div className="font-semibold">Impresora Térmica</div>
              <div className="text-sm text-muted-foreground">Configurar impresora de tickets</div>
            </div>
          </Link>
          <Link
            href="/dashboard/settings/fiscal"
            className="p-4 border border-border rounded-lg hover:bg-muted hover-lift transition-all flex items-center gap-3"
          >
            <span className="text-2xl">🧾</span>
            <div>
              <div className="font-semibold">Sistema Fiscal</div>
              <div className="text-sm text-muted-foreground">Configurar impresora fiscal</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex space-x-1">
          {[
            { id: "payment" as SettingsTab, label: "Pasarelas de Pago", icon: "💳" },
            { id: "email" as SettingsTab, label: "Email", icon: "📧" },
            { id: "general" as SettingsTab, label: "General", icon: "⚙️" },
            { id: "pwa_icons" as SettingsTab, label: "Iconos PWA", icon: "🎨" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
                border-b-2 border-transparent
                ${
                  activeTab === tab.id
                    ? "text-primary border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg animate-fadeIn">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 text-success p-4 rounded-lg animate-fadeIn">
          {success}
        </div>
      )}

      {/* Payment Gateways Tab */}
      {activeTab === "payment" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Pasarelas de Pago</h3>
              <p className="text-sm text-muted-foreground">
                Configura las pasarelas de pago panameñas
              </p>
            </div>

            {/* Gateway Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Seleccionar Pasarela</label>
              <select
                value={activeGateway}
                onChange={(e) => setActiveGateway(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {Object.keys(gatewayNames).map((key) => (
                  <option key={key} value={key}>
                    {gatewayNames[key]}
                  </option>
                ))}
              </select>
            </div>

            {/* Gateway Form */}
            {paymentGateways[activeGateway] && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`${activeGateway}_enabled`}
                    checked={paymentGateways[activeGateway].enabled}
                    onChange={(e) =>
                      updatePaymentGateway(activeGateway, "enabled", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-input"
                  />
                  <label htmlFor={`${activeGateway}_enabled`} className="font-medium">
                    Habilitar {gatewayNames[activeGateway]}
                  </label>
                </div>

                {activeGateway === "yappy" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Merchant ID</label>
                      <input
                        type="text"
                        value={paymentGateways[activeGateway].merchant_id || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "merchant_id", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu Merchant ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Secret Key</label>
                      <input
                        type="password"
                        value={paymentGateways[activeGateway].secret_key || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "secret_key", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu Secret Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">API Key</label>
                      <input
                        type="password"
                        value={paymentGateways[activeGateway].api_key || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "api_key", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu API Key"
                      />
                    </div>
                  </>
                )}

                {(activeGateway === "paguelofacil" ||
                  activeGateway === "tilopay" ||
                  activeGateway === "banesco") && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">API Key</label>
                      <input
                        type="password"
                        value={paymentGateways[activeGateway].api_key || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "api_key", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Merchant ID</label>
                      <input
                        type="text"
                        value={paymentGateways[activeGateway].merchant_id || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "merchant_id", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu Merchant ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Webhook URL</label>
                      <input
                        type="url"
                        value={paymentGateways[activeGateway].webhook_url || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "webhook_url", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://tu-dominio.com/api/public/payments/..."
                      />
                    </div>
                  </>
                )}

                {activeGateway === "payu" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Merchant ID</label>
                      <input
                        type="text"
                        value={paymentGateways[activeGateway].merchant_id || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "merchant_id", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu Merchant ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">API Key</label>
                      <input
                        type="password"
                        value={paymentGateways[activeGateway].api_key || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "api_key", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">API Login</label>
                      <input
                        type="text"
                        value={paymentGateways[activeGateway].api_login || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "api_login", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Tu API Login"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Webhook URL</label>
                      <input
                        type="url"
                        value={paymentGateways[activeGateway].webhook_url || ""}
                        onChange={(e) =>
                          updatePaymentGateway(activeGateway, "webhook_url", e.target.value)
                        }
                        className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://tu-dominio.com/api/public/payments/payu/webhook"
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => handleSavePayment(activeGateway)}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {saving ? "Guardando..." : "Guardar Configuración"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === "email" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Configuración de Email</h3>
            <p className="text-sm text-muted-foreground">
              Configura el servicio de email Resend para envío de confirmaciones
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="email_enabled"
                checked={emailConfig.enabled}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, enabled: e.target.checked })
                }
                className="w-4 h-4 rounded border-input"
              />
              <label htmlFor="email_enabled" className="font-medium">
                Habilitar envío de emails
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Resend API Key</label>
              <input
                type="password"
                value={emailConfig.api_key || ""}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, api_key: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="re_..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obtén tu API key desde{" "}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  resend.com/api-keys
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">From Email</label>
              <input
                type="email"
                value={emailConfig.from_email || ""}
                onChange={(e) =>
                  setEmailConfig({ ...emailConfig, from_email: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="noreply@pimetransport.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email verificado en Resend. Para pruebas usa: onboarding@resend.dev
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={handleSaveEmail}
                disabled={saving}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Configuración General</h3>
            <p className="text-sm text-muted-foreground">
              Configuración general del sistema
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la Empresa</label>
              <input
                type="text"
                value={generalConfig.company_name}
                onChange={(e) =>
                  setGeneralConfig({ ...generalConfig, company_name: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="TDP Ticketing System"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL del Logo</label>
              <input
                type="url"
                value={generalConfig.company_logo_url || ""}
                onChange={(e) =>
                  setGeneralConfig({ ...generalConfig, company_logo_url: e.target.value })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://tu-dominio.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Moneda</label>
                <select
                  value={generalConfig.currency}
                  onChange={(e) =>
                    setGeneralConfig({ ...generalConfig, currency: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="PAB">PAB - Balboa Panameño</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tasa ITBMS (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={generalConfig.itbms_rate}
                  onChange={(e) =>
                    setGeneralConfig({
                      ...generalConfig,
                      itbms_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zona Horaria</label>
                <select
                  value={generalConfig.timezone}
                  onChange={(e) =>
                    setGeneralConfig({ ...generalConfig, timezone: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="America/Panama">America/Panama</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Idioma</label>
                <select
                  value={generalConfig.language}
                  onChange={(e) =>
                    setGeneralConfig({ ...generalConfig, language: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Icons Tab */}
      {activeTab === "pwa_icons" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Configuración de Iconos PWA</h3>
              <p className="text-sm text-muted-foreground">
                Personaliza los colores y textos de los iconos para cada aplicación PWA
              </p>
            </div>

            <div className="space-y-6">
              {(["public", "admin", "pos", "scanner"] as PWAType[]).map((pwa) => {
                const config = pwaIconsConfig[pwa];
                const pwaNames: Record<PWAType, string> = {
                  public: "Pública",
                  admin: "Admin",
                  pos: "POS",
                  scanner: "Scanner",
                };

                return (
                  <div key={pwa} className="border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">{pwaNames[pwa]}</h4>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-border"
                          style={{
                            background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`,
                          }}
                        />
                        <span className="text-sm text-muted-foreground">{config.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre</label>
                        <input
                          type="text"
                          value={config.name}
                          onChange={(e) => updatePWAIconConfig(pwa, "name", e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre Corto</label>
                        <input
                          type="text"
                          value={config.shortName}
                          onChange={(e) => updatePWAIconConfig(pwa, "shortName", e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Texto del Icono</label>
                        <input
                          type="text"
                          value={config.text}
                          onChange={(e) => updatePWAIconConfig(pwa, "text", e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          maxLength={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Máximo 3 caracteres</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Color Primario</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={config.primaryColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "primaryColor", e.target.value)}
                            className="w-16 h-10 rounded border border-input cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.primaryColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "primaryColor", e.target.value)}
                            className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Color Secundario</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={config.secondaryColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "secondaryColor", e.target.value)}
                            className="w-16 h-10 rounded border border-input cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.secondaryColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "secondaryColor", e.target.value)}
                            className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="#2563eb"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Color de Tema</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={config.themeColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "themeColor", e.target.value)}
                            className="w-16 h-10 rounded border border-input cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.themeColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "themeColor", e.target.value)}
                            className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Color de Fondo</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={config.backgroundColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "backgroundColor", e.target.value)}
                            className="w-16 h-10 rounded border border-input cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.backgroundColor}
                            onChange={(e) => updatePWAIconConfig(pwa, "backgroundColor", e.target.value)}
                            className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-border mt-6 flex gap-4">
              <button
                onClick={handleSavePWAIcons}
                disabled={saving}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? "Guardando..." : "Guardar Configuración"}
              </button>
              <button
                onClick={handleGenerateIcons}
                disabled={generatingIcons || saving}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {generatingIcons ? "Generando..." : "Generar Iconos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

