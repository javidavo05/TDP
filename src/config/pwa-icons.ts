/**
 * Configuración centralizada de iconos y branding para cada PWA
 * Modifica estos valores para personalizar los iconos de cada aplicación
 */

export type PWAType = "public" | "admin" | "pos" | "scanner";

export interface PWAIconConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  text: string; // Texto a mostrar en el icono
  iconPrefix: string; // Prefijo para nombres de archivos de iconos
}

export const PWA_CONFIGS: Record<PWAType, PWAIconConfig> = {
  public: {
    name: "TDP Ticketing System",
    shortName: "TDP Tickets",
    description: "Sistema de ticketing de transporte nacional - Compra boletos de bus en línea",
    themeColor: "#3b82f6",
    backgroundColor: "#ffffff",
    primaryColor: "#3b82f6", // Azul primario
    secondaryColor: "#2563eb", // Azul secundario
    text: "TDP",
    iconPrefix: "icon",
  },
  admin: {
    name: "TDP Admin Dashboard",
    shortName: "TDP Admin",
    description: "Panel de administración del sistema de ticketing TDP",
    themeColor: "#8b5cf6",
    backgroundColor: "#ffffff",
    primaryColor: "#8b5cf6", // Morado primario
    secondaryColor: "#7c3aed", // Morado secundario
    text: "ADM",
    iconPrefix: "icon-admin",
  },
  pos: {
    name: "TDP POS Terminal",
    shortName: "TDP POS",
    description: "Terminal de punto de venta para sistema de ticketing TDP",
    themeColor: "#3b82f6",
    backgroundColor: "#1e293b",
    primaryColor: "#3b82f6", // Azul primario
    secondaryColor: "#2563eb", // Azul secundario
    text: "POS",
    iconPrefix: "icon-pos",
  },
  scanner: {
    name: "TDP Ticket Scanner",
    shortName: "TDP Scanner",
    description: "Escáner de códigos QR para validación de boletos TDP",
    themeColor: "#10b981",
    backgroundColor: "#000000",
    primaryColor: "#10b981", // Verde primario
    secondaryColor: "#059669", // Verde secundario
    text: "QR",
    iconPrefix: "icon-scanner",
  },
};

/**
 * Tamaños de iconos a generar
 */
export const ICON_SIZES = [16, 32, 96, 192, 512] as const;

/**
 * Obtiene la configuración para un tipo de PWA
 */
export function getPWAConfig(type: PWAType): PWAIconConfig {
  return PWA_CONFIGS[type];
}

/**
 * Genera el nombre de archivo para un icono
 */
export function getIconFileName(type: PWAType, size: number): string {
  const config = getPWAConfig(type);
  return `${config.iconPrefix}-${size}x${size}.png`;
}

/**
 * Genera el nombre de archivo para el favicon
 */
export function getFaviconFileName(type: PWAType): string {
  const config = getPWAConfig(type);
  return `favicon-${config.iconPrefix.replace("icon-", "") || "public"}.ico`;
}

