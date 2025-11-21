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
    themeColor: "#ef4444",
    backgroundColor: "#ffffff",
    primaryColor: "#ef4444", // Rojo primario
    secondaryColor: "#dc2626", // Rojo secundario
    text: "TDP",
    iconPrefix: "icon",
  },
  admin: {
    name: "TDP Admin Dashboard",
    shortName: "TDP Admin",
    description: "Panel de administración del sistema de ticketing TDP",
    themeColor: "#f59e0b",
    backgroundColor: "#ffffff",
    primaryColor: "#f59e0b", // Naranja primario
    secondaryColor: "#d97706", // Naranja secundario
    text: "ADM",
    iconPrefix: "icon-admin",
  },
  pos: {
    name: "TDP POS Terminal",
    shortName: "TDP POS",
    description: "Terminal de punto de venta para sistema de ticketing TDP",
    themeColor: "#06b6d4",
    backgroundColor: "#0f172a",
    primaryColor: "#06b6d4", // Cyan primario
    secondaryColor: "#0891b2", // Cyan secundario
    text: "POS",
    iconPrefix: "icon-pos",
  },
  scanner: {
    name: "TDP Ticket Scanner",
    shortName: "TDP Scanner",
    description: "Escáner de códigos QR para validación de boletos TDP",
    themeColor: "#a855f7",
    backgroundColor: "#000000",
    primaryColor: "#a855f7", // Púrpura primario
    secondaryColor: "#9333ea", // Púrpura secundario
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

