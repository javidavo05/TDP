import { SettingsRepository, SystemSetting } from "@/infrastructure/db/supabase/SettingsRepository";

export interface PaymentGatewayConfig {
  enabled: boolean;
  merchant_id?: string;
  secret_key?: string;
  api_key?: string;
  api_login?: string;
  webhook_url?: string;
}

export interface EmailConfig {
  enabled: boolean;
  api_key?: string;
  from_email?: string;
}

export interface GeneralConfig {
  company_name: string;
  company_logo_url?: string;
  currency: string;
  itbms_rate: number;
  timezone: string;
  language: string;
}

export class SettingsService {
  constructor(private repository: SettingsRepository) {}

  async getPaymentGateways(): Promise<Record<string, PaymentGatewayConfig>> {
    const settings = await this.repository.getByCategory("payment");
    const gateways: Record<string, PaymentGatewayConfig> = {};

    settings.forEach((setting) => {
      const gatewayName = setting.key.replace("payment_", "");
      gateways[gatewayName] = setting.value as PaymentGatewayConfig;
    });

    return gateways;
  }

  async getPaymentGateway(gateway: string): Promise<PaymentGatewayConfig | null> {
    const setting = await this.repository.get(`payment_${gateway}`);
    return setting ? (setting.value as PaymentGatewayConfig) : null;
  }

  async updatePaymentGateway(gateway: string, config: PaymentGatewayConfig): Promise<void> {
    await this.repository.set(`payment_${gateway}`, config, "payment", `Configuration for ${gateway} payment gateway`);
  }

  async getEmailConfig(): Promise<EmailConfig> {
    const setting = await this.repository.get("email_resend");
    return setting ? (setting.value as EmailConfig) : { enabled: false, api_key: "", from_email: "" };
  }

  async updateEmailConfig(config: EmailConfig): Promise<void> {
    await this.repository.set("email_resend", config, "email", "Resend email service configuration");
  }

  async getGeneralConfig(): Promise<GeneralConfig> {
    const setting = await this.repository.get("general");
    return setting
      ? (setting.value as GeneralConfig)
      : {
          company_name: "TDP Ticketing System",
          currency: "USD",
          itbms_rate: 0.07,
          timezone: "America/Panama",
          language: "es",
        };
  }

  async updateGeneralConfig(config: GeneralConfig): Promise<void> {
    // Validate ITBMS rate
    if (config.itbms_rate < 0 || config.itbms_rate > 1) {
      throw new Error("ITBMS rate must be between 0 and 1");
    }

    // Validate currency
    if (!["USD", "PAB"].includes(config.currency)) {
      throw new Error("Currency must be USD or PAB");
    }

    await this.repository.set("general", config, "general", "General system configuration");
  }

  async getAllSettings(): Promise<{
    payment: Record<string, PaymentGatewayConfig>;
    email: EmailConfig;
    general: GeneralConfig;
  }> {
    const [payment, email, general] = await Promise.all([
      this.getPaymentGateways(),
      this.getEmailConfig(),
      this.getGeneralConfig(),
    ]);

    return { payment, email, general };
  }

  async getSetting(key: string): Promise<SystemSetting | null> {
    return this.repository.get(key);
  }
}

